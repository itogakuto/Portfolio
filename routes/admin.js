var express = require('express');
var path = require('path');
var fs = require('fs');
var multer = require('multer');
var bcrypt = require('bcryptjs');
var { PrismaClient } = require('@prisma/client');

var router = express.Router();
var prisma = new PrismaClient();

var uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

var allowedExtensions = ['.jpg', '.jpeg', '.png'];

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    var base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, Date.now() + '-' + base + ext);
  },
});

var upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    var ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.heic' || ext === '.heif') {
      req.fileValidationError = 'HEIC形式の画像はアップロードできません。';
      return cb(null, false);
    }
    if (!allowedExtensions.includes(ext)) {
      req.fileValidationError = '画像はJPGまたはPNG形式のみ対応しています。';
      return cb(null, false);
    }
    cb(null, true);
  },
});

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.redirect('/login');
}

router.get('/login', function (req, res) {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: null });
});

router.post('/login', async function (req, res, next) {
  try {
    var admin = await prisma.admin.findUnique({
      where: { email: req.body.email },
    });
    if (!admin) {
      return res.render('admin/login', { error: 'メールかパスワードが違います。' });
    }
    var ok = await bcrypt.compare(req.body.password, admin.passwordHash);
    if (!ok) {
      return res.render('admin/login', { error: 'メールかパスワードが違います。' });
    }
    req.session.adminId = admin.id;
    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

router.post('/logout', function (req, res) {
  req.session.destroy(function () {
    res.redirect('/login');
  });
});

router.get('/admin', requireAuth, function (req, res) {
  res.render('admin/dashboard');
});

router.get('/admin/topics', requireAuth, async function (req, res, next) {
  try {
    var q = (req.query.q || '').trim();
    var where = q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { excerpt: { contains: q, mode: 'insensitive' } },
            { body: { contains: q, mode: 'insensitive' } },
            { category: { name: { contains: q, mode: 'insensitive' } } },
            { tags: { some: { name: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {};
    var topics = await prisma.topic.findMany({
      where: where,
      include: { category: true, tags: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    res.render('admin/topics/index', { topics: topics, query: q });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/topics/new', requireAuth, async function (req, res, next) {
  try {
    var categories = await prisma.topicCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    var tags = await prisma.topicTag.findMany({ orderBy: { sortOrder: 'asc' } });
    res.render('admin/topics/form', {
      topic: null,
      categories: categories,
      tags: tags,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/topics', requireAuth, upload.single('image'), async function (req, res, next) {
  try {
    if (req.fileValidationError) {
      var categories = await prisma.topicCategory.findMany({ orderBy: { sortOrder: 'asc' } });
      var tags = await prisma.topicTag.findMany({ orderBy: { sortOrder: 'asc' } });
      return res.status(400).render('admin/topics/form', {
        topic: null,
        categories: categories,
        tags: tags,
        error: req.fileValidationError,
      });
    }
    var imageUrl = req.file ? '/uploads/' + req.file.filename : null;
    var tagIds = Array.isArray(req.body.tags)
      ? req.body.tags
      : req.body.tags
      ? [req.body.tags]
      : [];
    await prisma.topic.create({
      data: {
        title: req.body.title,
        excerpt: req.body.excerpt || null,
        body: req.body.body,
        imageUrl: imageUrl,
        link1Title: req.body.link1Title || null,
        link1Url: req.body.link1Url || null,
        link2Title: req.body.link2Title || null,
        link2Url: req.body.link2Url || null,
        isPublished: req.body.isPublished === 'on',
        sortOrder: Number(req.body.sortOrder || 0),
        categoryId: req.body.categoryId ? Number(req.body.categoryId) : null,
        tags: { connect: tagIds.map(function (id) { return { id: Number(id) }; }) },
      },
    });
    res.redirect('/admin/topics');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/topics/:id/edit', requireAuth, async function (req, res, next) {
  try {
    var topic = await prisma.topic.findUnique({
      where: { id: Number(req.params.id) },
      include: { tags: true },
    });
    if (!topic) {
      return res.redirect('/admin/topics');
    }
    var categories = await prisma.topicCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    var tags = await prisma.topicTag.findMany({ orderBy: { sortOrder: 'asc' } });
    res.render('admin/topics/form', {
      topic: topic,
      categories: categories,
      tags: tags,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/topics/bulk', requireAuth, async function (req, res, next) {
  try {
    var orderedIds = toArray(req.body.ids).map(function (id) { return Number(id); });
    var publishedFlags = toArray(req.body.published).map(function (value) { return String(value) === '1'; });
    var updates = orderedIds.map(function (id, index) {
      return prisma.topic.update({
        where: { id: id },
        data: {
          sortOrder: index,
          isPublished: publishedFlags[index] === true,
        },
      });
    });
    await prisma.$transaction(updates);
    res.redirect('/admin/topics');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/topics/:id', requireAuth, upload.single('image'), async function (req, res, next) {
  try {
    if (req.fileValidationError) {
      var topic = await prisma.topic.findUnique({
        where: { id: Number(req.params.id) },
        include: { tags: true },
      });
      var categories = await prisma.topicCategory.findMany({ orderBy: { sortOrder: 'asc' } });
      var tags = await prisma.topicTag.findMany({ orderBy: { sortOrder: 'asc' } });
      return res.status(400).render('admin/topics/form', {
        topic: topic,
        categories: categories,
        tags: tags,
        error: req.fileValidationError,
      });
    }
    var tagIds = Array.isArray(req.body.tags)
      ? req.body.tags
      : req.body.tags
      ? [req.body.tags]
      : [];
    var data = {
      title: req.body.title,
      excerpt: req.body.excerpt || null,
      body: req.body.body,
      link1Title: req.body.link1Title || null,
      link1Url: req.body.link1Url || null,
      link2Title: req.body.link2Title || null,
      link2Url: req.body.link2Url || null,
      isPublished: req.body.isPublished === 'on',
      sortOrder: Number(req.body.sortOrder || 0),
      categoryId: req.body.categoryId ? Number(req.body.categoryId) : null,
      tags: { set: tagIds.map(function (id) { return { id: Number(id) }; }) },
    };
    if (req.file) {
      data.imageUrl = '/uploads/' + req.file.filename;
    }
    await prisma.topic.update({
      where: { id: Number(req.params.id) },
      data: data,
    });
    res.redirect('/admin/topics');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/topics/:id/delete', requireAuth, async function (req, res, next) {
  try {
    await prisma.topic.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/topics');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/topics/:id/preview', requireAuth, async function (req, res, next) {
  try {
    var topic = await prisma.topic.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true, tags: true },
    });
    if (!topic) {
      return res.redirect('/admin/topics');
    }
    res.render('admin/topics/preview', { topic: topic });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/hero-images', requireAuth, async function (req, res, next) {
  try {
    var images = await prisma.heroImage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    res.render('admin/hero-images/index', { images: images, error: null });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/hero-images', requireAuth, upload.single('image'), async function (req, res, next) {
  try {
    if (req.fileValidationError) {
      var images = await prisma.heroImage.findMany({
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      return res.status(400).render('admin/hero-images/index', {
        images: images,
        error: req.fileValidationError,
      });
    }
    if (!req.file) {
      return res.redirect('/admin/hero-images');
    }
    await prisma.heroImage.create({
      data: {
        imageUrl: '/uploads/' + req.file.filename,
        altText: req.body.altText || null,
        isPublished: req.body.isPublished === 'on',
        sortOrder: Number(req.body.sortOrder || 0),
      },
    });
    res.redirect('/admin/hero-images');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/hero-images/:id/delete', requireAuth, async function (req, res, next) {
  try {
    await prisma.heroImage.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/hero-images');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/hero-images/bulk', requireAuth, async function (req, res, next) {
  try {
    var orderedIds = toArray(req.body.ids).map(function (id) { return Number(id); });
    var publishedFlags = toArray(req.body.published).map(function (value) { return String(value) === '1'; });
    var updates = orderedIds.map(function (id, index) {
      return prisma.heroImage.update({
        where: { id: id },
        data: {
          sortOrder: index,
          isPublished: publishedFlags[index] === true,
        },
      });
    });
    await prisma.$transaction(updates);
    res.redirect('/admin/hero-images');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/hero-phrases', requireAuth, async function (req, res, next) {
  try {
    var phrases = await prisma.heroPhrase.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    res.render('admin/hero-phrases/index', { phrases: phrases, error: null });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/news', requireAuth, async function (req, res, next) {
  try {
    var news = await prisma.news.findMany({
      orderBy: { interviewDate: 'desc' },
    });
    res.render('admin/news/index', { news: news, error: null });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/news', requireAuth, async function (req, res, next) {
  try {
    var title = (req.body.title || '').trim();
    var url = (req.body.url || '').trim();
    var interviewDate = (req.body.interviewDate || '').trim();
    if (!title || !url || !interviewDate) {
      var news = await prisma.news.findMany({
        orderBy: { interviewDate: 'desc' },
      });
      return res.status(400).render('admin/news/index', {
        news: news,
        error: 'タイトル・リンク・取材日は必須です。',
      });
    }
    await prisma.news.create({
      data: {
        title: title,
        subtitle: (req.body.subtitle || '').trim() || null,
        url: url,
        interviewDate: new Date(interviewDate),
      },
    });
    res.redirect('/admin/news');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/news/bulk', requireAuth, async function (req, res, next) {
  try {
    var ids = toArray(req.body.ids).map(function (id) { return Number(id); });
    var titles = toArray(req.body.titles);
    var urls = toArray(req.body.urls);
    var interviewDates = toArray(req.body.interviewDates);
    var updates = ids.map(function (id, index) {
      return prisma.news.update({
        where: { id: id },
        data: {
          title: titles[index] || '',
          subtitle: (toArray(req.body.subtitles)[index] || '').trim() || null,
          url: urls[index] || '',
          interviewDate: new Date(interviewDates[index]),
        },
      });
    });
    await prisma.$transaction(updates);
    res.redirect('/admin/news');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/news/:id/delete', requireAuth, async function (req, res, next) {
  try {
    await prisma.news.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/news');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/hero-phrases', requireAuth, async function (req, res, next) {
  try {
    await prisma.heroPhrase.create({
      data: {
        text: req.body.text,
        isPublished: req.body.isPublished === 'on',
        sortOrder: Number(req.body.sortOrder || 0),
      },
    });
    res.redirect('/admin/hero-phrases');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/hero-phrases/:id/delete', requireAuth, async function (req, res, next) {
  try {
    await prisma.heroPhrase.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/hero-phrases');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/hero-phrases/bulk', requireAuth, async function (req, res, next) {
  try {
    var orderedIds = toArray(req.body.ids).map(function (id) { return Number(id); });
    var texts = toArray(req.body.texts).map(function (text) { return String(text || '').trim(); });
    var publishedFlags = toArray(req.body.published).map(function (value) { return String(value) === '1'; });
    if (texts.some(function (text) { return text.length === 0; })) {
      var phrases = await prisma.heroPhrase.findMany({
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      phrases = phrases.map(function (phrase, index) {
        var override = texts[index];
        return Object.assign({}, phrase, {
          text: typeof override === 'string' ? override : phrase.text,
        });
      });
      return res.status(400).render('admin/hero-phrases/index', {
        phrases: phrases,
        error: 'フレーズは空欄にできません。',
      });
    }
    var updates = orderedIds.map(function (id, index) {
      return prisma.heroPhrase.update({
        where: { id: id },
        data: {
          sortOrder: index,
          text: texts[index],
          isPublished: publishedFlags[index] === true,
        },
      });
    });
    await prisma.$transaction(updates);
    res.redirect('/admin/hero-phrases');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/categories', requireAuth, async function (req, res, next) {
  try {
    var categories = await prisma.topicCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    res.render('admin/categories/index', { categories: categories, error: null });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/categories', requireAuth, async function (req, res, next) {
  try {
    await prisma.topicCategory.create({
      data: {
        name: req.body.name,
        sortOrder: Number(req.body.sortOrder || 0),
      },
    });
    res.redirect('/admin/categories');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/categories/bulk', requireAuth, async function (req, res, next) {
  try {
    var orderedIds = toArray(req.body.ids).filter(function (id) { return id; });
    var nameList = toArray(req.body.names).map(function (name) { return String(name || '').trim(); });
    var nameById = {};
    orderedIds.forEach(function (id, index) {
      nameById[id] = nameList[index];
    });
    if (nameList.some(function (name) { return name.length === 0; })) {
      var categories = await prisma.topicCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      categories = categories.map(function (category) {
        var override = nameById[category.id];
        return Object.assign({}, category, {
          name: typeof override === 'string' ? override : category.name,
        });
      });
      return res.status(400).render('admin/categories/index', {
        categories: categories,
        error: 'カテゴリ名は空欄にできません。',
      });
    }
    var uniqueNames = new Set(nameList);
    if (uniqueNames.size !== nameList.length) {
      var dupCategories = await prisma.topicCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      dupCategories = dupCategories.map(function (category) {
        var override = nameById[category.id];
        return Object.assign({}, category, {
          name: typeof override === 'string' ? override : category.name,
        });
      });
      return res.status(400).render('admin/categories/index', {
        categories: dupCategories,
        error: 'カテゴリ名が重複しています。',
      });
    }
    var tempUpdates = orderedIds.map(function (id) {
      return prisma.topicCategory.update({
        where: { id: Number(id) },
        data: { name: '__temp__' + id + '_' + Date.now() },
      });
    });
    var updates = orderedIds.map(function (id, index) {
      return prisma.topicCategory.update({
        where: { id: Number(id) },
        data: {
          name: nameList[index] || '',
          sortOrder: index,
        },
      });
    });
    await prisma.$transaction(tempUpdates.concat(updates));
    res.redirect('/admin/categories');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/categories/:id/delete', requireAuth, async function (req, res, next) {
  try {
    await prisma.topicCategory.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/categories');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/tags', requireAuth, async function (req, res, next) {
  try {
    var tags = await prisma.topicTag.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    res.render('admin/tags/index', { tags: tags, error: null });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/tags', requireAuth, async function (req, res, next) {
  try {
    await prisma.topicTag.create({
      data: {
        name: req.body.name,
        sortOrder: Number(req.body.sortOrder || 0),
      },
    });
    res.redirect('/admin/tags');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/tags/bulk', requireAuth, async function (req, res, next) {
  try {
    var orderedIds = toArray(req.body.ids).filter(function (id) { return id; });
    var nameList = toArray(req.body.names).map(function (name) { return String(name || '').trim(); });
    var nameById = {};
    orderedIds.forEach(function (id, index) {
      nameById[id] = nameList[index];
    });
    if (nameList.some(function (name) { return name.length === 0; })) {
      var tags = await prisma.topicTag.findMany({
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      tags = tags.map(function (tag) {
        var override = nameById[tag.id];
        return Object.assign({}, tag, {
          name: typeof override === 'string' ? override : tag.name,
        });
      });
      return res.status(400).render('admin/tags/index', {
        tags: tags,
        error: 'タグ名は空欄にできません。',
      });
    }
    var uniqueNames = new Set(nameList);
    if (uniqueNames.size !== nameList.length) {
      var dupTags = await prisma.topicTag.findMany({
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      dupTags = dupTags.map(function (tag) {
        var override = nameById[tag.id];
        return Object.assign({}, tag, {
          name: typeof override === 'string' ? override : tag.name,
        });
      });
      return res.status(400).render('admin/tags/index', {
        tags: dupTags,
        error: 'タグ名が重複しています。',
      });
    }
    var tempUpdates = orderedIds.map(function (id) {
      return prisma.topicTag.update({
        where: { id: Number(id) },
        data: { name: '__temp__' + id + '_' + Date.now() },
      });
    });
    var updates = orderedIds.map(function (id, index) {
      return prisma.topicTag.update({
        where: { id: Number(id) },
        data: {
          name: nameList[index] || '',
          sortOrder: index,
        },
      });
    });
    await prisma.$transaction(tempUpdates.concat(updates));
    res.redirect('/admin/tags');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/tags/:id/delete', requireAuth, async function (req, res, next) {
  try {
    await prisma.topicTag.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/tags');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/contacts', requireAuth, async function (req, res, next) {
  try {
    var q = (req.query.q || '').trim();
    var where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phoneNumber: { contains: q, mode: 'insensitive' } },
            { message: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    var contacts = await prisma.contact.findMany({
      where: where,
      orderBy: { createdAt: 'desc' },
    });
    res.render('admin/contacts/index', { contacts: contacts, query: q });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/contacts/:id', requireAuth, async function (req, res, next) {
  try {
    var contact = await prisma.contact.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!contact) {
      return res.redirect('/admin/contacts');
    }
    res.render('admin/contacts/show', { contact: contact });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/contacts/:id/delete', requireAuth, async function (req, res, next) {
  try {
    await prisma.contact.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/contacts');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
