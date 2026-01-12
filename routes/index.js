var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
var https = require('https');
var querystring = require('querystring');

var prisma = new PrismaClient();

function postForm(url, payload) {
  var data = querystring.stringify(payload);
  if (typeof fetch === 'function') {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data,
    });
  }

  return new Promise(function (resolve, reject) {
    var target = new URL(url);
    var options = {
      method: 'POST',
      hostname: target.hostname,
      path: target.pathname + target.search,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    var req = https.request(options, function (res) {
      res.on('data', function () {});
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    var heroImages = await prisma.heroImage.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });
    var heroPhrases = await prisma.heroPhrase.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });
    var topics = await prisma.topic.findMany({
      where: { isPublished: true },
      include: { category: true, tags: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    var categories = await prisma.topicCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    var tags = await prisma.topicTag.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    var news = await prisma.news.findMany({
      orderBy: { interviewDate: 'desc' },
    });
    res.render('index', {
      title: 'PORTFOLIO',
      heroImages: heroImages,
      heroPhrases: heroPhrases,
      topics: topics,
      categories: categories,
      tags: tags,
      news: news,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/topics/:id', async function(req, res, next) {
  try {
    var topic = await prisma.topic.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true, tags: true },
    });
    if (!topic || (!topic.isPublished && !(req.session && req.session.adminId))) {
      return res.status(404).render('error', { message: 'Not Found', error: {} });
    }
    res.render('topic', { topic: topic });
  } catch (error) {
    next(error);
  }
});

router.post('/contact', async function(req, res, next) {
  try {
    var name = (req.body.name || '').trim();
    var email = (req.body.email || '').trim();
    var message = (req.body.message || '').trim();
    if (!name || !email || !message) {
      return res.status(400).redirect('/#contact');
    }
    var payload = {
      'name': name,
      'email': email,
      'phone-number': (req.body['phone-number'] || '').trim(),
      'message': message,
      'timestamp': new Date().toISOString(),
    };
    await prisma.contact.create({
      data: {
        name: payload.name,
        email: payload.email,
        phoneNumber: payload['phone-number'] || null,
        message: payload.message,
      },
    });
    if (process.env.GAS_WEBAPP_URL) {
      try {
        await postForm(process.env.GAS_WEBAPP_URL, payload);
      } catch (gasError) {
        console.error('GAS webhook error:', gasError);
      }
    }
    res.redirect('/#contact');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
