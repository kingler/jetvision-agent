import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create sample feedback entries
  const feedback1 = await prisma.feedback.create({
    data: {
      userId: 'system-init',
      feedback: 'Initial system setup completed successfully',
      metadata: {
        type: 'system',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    }
  });

  const feedback2 = await prisma.feedback.create({
    data: {
      userId: 'test-user-001',
      feedback: 'JetVision Agent is working great!',
      metadata: {
        type: 'user_feedback',
        rating: 5,
        features_used: ['chat', 'apollo-integration', 'avinode-search']
      }
    }
  });

  console.log('Created feedback entries:', { feedback1, feedback2 });
  
  // Query to verify
  const count = await prisma.feedback.count();
  console.log(`Total feedback entries in database: ${count}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Database seed completed successfully!');
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });