const puppeteer = require('puppeteer-core');
const waitOption = { waitUntil: 'domcontentloaded' };
const EventEmitter = require('events').EventEmitter;
const event = new EventEmitter();

module.exports = function(args) {
  const { config, year, month, reasons, fare, executablePath } = args;
  const timeline = require('./timeline')('yyyy-MM-dd', year, month);
  const fareType = fare.type;
  let page;
  /**
   * 登录
   *
   * @param {*} username
   * @param {*} password
   * @returns
   */
  async function Login(username, password) {
    await page.goto('http://passport.isoftstone.com/');
    await page.waitForSelector('#emp_DomainName');
    await page.type('#emp_DomainName', username);
    await page.waitForSelector('#emp_Password');
    await page.type('#emp_Password', password);
    await Promise.all([
      page.waitForNavigation(waitOption),
      page.waitForSelector('#BtnLogin'),
      page.click('#BtnLogin')
    ]);
    return;
  }
  /**
   * 去报销
   *
   * @returns
   */
  async function GoToExpense() {
    await page.waitForSelector('[title=日常报销]');
    let href = await page.$eval('[title=日常报销]', ele => ele.href);
    await page.goto(href);
    await Promise.all([
      page.waitForNavigation(waitOption),
      page.waitForSelector('[value=新增]'),
      page.click('[value=新增]')
    ]);
    return;
  }

  /**
   * 同意协议
   *
   * @returns
   */
  async function Accept() {
    await page.waitForSelector('#prinfo');
    await page.click('#prinfo');
    await page.waitForSelector('#prinfo1');
    await page.click('#prinfo1');
    await Promise.all([
      page.waitForNavigation(),
      page.waitForSelector('#accept'),
      page.click('#accept')
    ]);
    return;
  }
  async function fillBase(browser) {
    browser.on('targetdestroyed', () => {});
    browser.on('targetcreated', async () => {
      let pages = await browser.pages();
      let curPage = pages[1];
      await curPage.waitForSelector('#txtPrjName');
      await curPage.type('#txtPrjName', '数字广东');
      await curPage.waitForSelector('#btnQuery');
      await curPage.click('#btnQuery');
      curPage.on('requestfinished', async req => {
        await req.url().endsWith('/Selector/ProjectSelect.aspx');
        await curPage.waitForSelector('#select');
        await curPage.click('#select');
        await curPage.waitForSelector('[onclick^=SelectOK]');
        await curPage.click('[onclick^=SelectOK]');
      });
    });
    await page.waitForSelector('[id$=IMGPro]');
    await page.click('[id$=IMGPro]');
    await page.waitForSelector('[id$=ddlYear]');
    await page.select('[id$=ddlYear]', year);
    await page.waitForSelector('[id$=ddlMonth]');
    await page.select('[id$=ddlMonth]', +month + '');
    await page.waitForSelector('[id$=txtExcuse1]');
    await page.type('[id$=txtExcuse1]', reasons);
  }
  /**
   * 等待中
   *
   */
  async function wait() {
    await new Promise(resolve => {
      let timer;
      event.once('waited', () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
          resolve();
        }
      });
      timer = setInterval(() => {
        page
          .$eval('#ctl00_ContentPlaceHolder1_UpdateProgress1', el => {
            return el.style.display === 'none';
          })
          .then(valid => {
            if (valid) event.emit('waited');
          });
      }, 100);
    });
  }

  /**
   * 填充单条车费
   *
   * @param {*} date
   * @returns
   */
  async function saveFareRecord(date) {
    await page.waitForSelector('#Table4 input[id$=TDDate]');
    await page.$eval(
      '#Table4 input[id$=TDDate]',
      (el, date) => (el.value = date),
      date
    );
    await page.waitForSelector('#Table4 select[id$=ddlExpenseType]');
    await page.select('#Table4 select[id$=ddlExpenseType]', fareType);
    await page.waitForSelector('#Table4 input[id$=txtFrom]');
    await page.type('#Table4 input[id$=txtFrom]', fare.from);
    await page.waitForSelector('#Table4 input[id$=txtPlaceTO]');
    await page.type('#Table4 input[id$=txtPlaceTO]', fare.to);
    await page.waitForSelector('#Table4 input[id$=txtDesc]');
    await page.type('#Table4 input[id$=txtDesc]', fare.desc);
    await page.waitForSelector('#Table4 input[id$=txtTotal]');
    await page.type('#Table4 input[id$=txtTotal]', '50');
    await page.waitForSelector('#Table4 [href*=WebForm_DoPostBackWithOptions]');
    await page.click('#Table4 [href*=WebForm_DoPostBackWithOptions]');
    await wait();
    return;
  }

  /**
   * 填充车费
   *
   * @returns
   */
  async function fillFare() {
    for (const i in timeline) {
      if (i < 8) await saveFareRecord(timeline[i]);
    }
  }

  /**
   * 填充单条餐费
   *
   * @param {*} date
   */
  async function saveOtherRecord(date) {
    await page.waitForSelector('#Table7 input[id$=ODDate]');
    await page.$eval(
      '#Table7 input[id$=ODDate]',
      (el, date) => (el.value = date),
      date
    );
    await page.waitForSelector('#Table7 select[id$=ODDesc]');
    await page.select('#Table7 select[id$=ODDesc]', '误餐费');
    await page.waitForSelector('#Table7 input[id$=ODTotal]');
    await page.type('#Table7 input[id$=ODTotal]', '25');
    await page.waitForSelector('#Table7 [href*=WebForm_DoPostBackWithOptions]');
    await page.click('#Table7 [href*=WebForm_DoPostBackWithOptions]');
    await wait();
  }

  /**
   * 填充餐费费
   *
   * @returns
   */
  async function FillOther() {
    await page.waitForSelector('[id$=Linkbutton4]');
    await page.click('[id$=Linkbutton4]');
    await wait();
    for (const i in timeline) {
      if (i < 12) await saveOtherRecord(timeline[i]);
    }
    return;
  }

  async function main() {
    const width = 1150;
    const height = 700;
    const browser = await puppeteer.launch({
      headless: false,
      executablePath,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${width},${height}`
      ]
    });
    browser.on('disconnected', () => {});

    let pages = await browser.pages();
    page = pages[0];
    await page.setViewport({
      width,
      height
    });
    await Login(config.username, config.password);
    await GoToExpense();
    await Accept();
    await fillBase(browser);
    await fillFare();
    await FillOther();
  }
  main();
};
