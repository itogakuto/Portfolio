const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail =
    process.env.ADMIN_EMAIL || "drycurry4444@gmail.com";
  const adminPassword =
    process.env.ADMIN_PASSWORD || "Fuuchann0707";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash },
  });

  const categories = ["sample1", "sample2"];
  for (const [index, name] of categories.entries()) {
    await prisma.topicCategory.upsert({
      where: { name },
      update: { sortOrder: index },
      create: { name, sortOrder: index },
    });
  }

  const tags = ["sample1", "sample2"];
  for (const [index, name] of tags.entries()) {
    await prisma.topicTag.upsert({
      where: { name },
      update: { sortOrder: index },
      create: { name, sortOrder: index },
    });
  }

  const heroPhrases = ["web開発", "アプリ開発"];
  for (const [index, text] of heroPhrases.entries()) {
    const existing = await prisma.heroPhrase.findFirst({ where: { text } });
    if (existing) {
      await prisma.heroPhrase.update({
        where: { id: existing.id },
        data: { sortOrder: index },
      });
    } else {
      await prisma.heroPhrase.create({
        data: { text, sortOrder: index },
      });
    }
  }

  const projectTags = ["Strategy", "Web3", "B2B"];
  for (const name of projectTags) {
    await prisma.projectTag.upsert({
      where: { slug: name.toLowerCase() },
      update: { name },
      create: { name, slug: name.toLowerCase() },
    });
  }

  const projectStacks = ["Node.js", "Three.js", "Prisma"];
  for (const name of projectStacks) {
    await prisma.projectTechStack.upsert({
      where: { slug: name.toLowerCase().replace(/\./g, "") },
      update: { name },
      create: { name, slug: name.toLowerCase().replace(/\./g, "") },
    });
  }

  const sampleProject = await prisma.project.upsert({
    where: { slug: "signal-core" },
    update: {},
    create: {
      title: "Signal Core",
      slug: "signal-core",
      summary: "信頼性の高いプロダクト基盤とWebGL体験を統合した実装検証。",
      bodyMarkdown: "## Overview\n高負荷環境下でも滑らかに動くUI/UXを設計。\n\n- WebGL背景\n- CMS + Prisma運用\n- Performance Budget",
      coverImage: "/images/hunting.png",
      role: "Full-stack",
      isFeatured: true,
      publishedAt: new Date(),
      order: 0,
    },
  });

  const tagRecords = await prisma.projectTag.findMany();
  const stackRecords = await prisma.projectTechStack.findMany();
  await prisma.project.update({
    where: { id: sampleProject.id },
    data: {
      tags: { connect: tagRecords.map((tag) => ({ id: tag.id })) },
      techStacks: { connect: stackRecords.map((stack) => ({ id: stack.id })) },
      links: {
        create: [
          { label: "Project Site", url: "https://example.com", order: 0 },
        ],
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
