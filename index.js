require('dotenv').config();

const mongoose = require('mongoose');
const { devNull } = require('os');
const puppeteer = require('puppeteer');

const Game = mongoose.model('game', new mongoose.Schema({
  img: String,
  title: String,
  plataform: String,
  price: Number

}), "mario");

const marioDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connect to DB');
  } catch (error) {
    console.error("Error connecting to DB", error);
  }
};

const scrapeGames = async () => {
  await marioDB();

  const url = 'https://www.game.es/';

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.type('#searchinput', 'mario juego');
  await page.keyboard.press('Enter',);
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

  const img = await page.$$eval('div.search-item a.figure img.img-responsive', (nodes) =>
    nodes.map((n) => n.src)
  );

  const title = await page.$$eval('div.search-item h3.title', (nodes) =>
    nodes.map((n) => n.innerText)
  );

  const plataform = await page.$$eval('div.search-item div.info-wrap a.btn span.cm-txt', (nodes) =>
    nodes.map((n) => n.innerText)
  );

  const priceInt = await page.$$eval('div.search-item div.buy-new div.buy--price span.int', (nodes) =>
    nodes.map((n) => n.innerText)
  );

  const priceDecimal = await page.$$eval('div.search-item div.buy-new div.buy--price span.decimal', (nodes) =>
    nodes.map((n) => n.innerText)
  );

  const gamesMario = title.slice(0, 20).map((value, index) => {
    return {
      img: img[index],
      title: title[index],
      plataform: plataform[index],
      price: parseFloat(`${priceInt[index]}.${priceDecimal[index].slice(1)}`)
    }
  });

  gamesMario.map(async (game) => {
    const gameSchema = new Game(game)
    try {
      await gameSchema.save();
      console.log(`Game saved ${gameSchema.title} to the DB`)
    } catch (error) {
      console.error(error);
    }
  })

  await browser.close();
};

scrapeGames();

