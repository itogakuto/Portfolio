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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
