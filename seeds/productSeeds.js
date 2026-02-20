const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Explicitly load config.env from project root
dotenv.config({ path: `${__dirname}/../config.env` });

const Product = require('../models/productModels');
const Stock = require('../models/stockModels');
const StockMovement = require('../models/stockMovementModels');

/**
 * SEED DATA: Products with Stock
 *
 * This script:
 * 1. Creates products in bulk
 * 2. Creates corresponding stock records
 * 3. Records initial stock movements
 * 4. Uses transactions for data integrity
 *
 * Usage:
 *   node seeds/productSeeds.js
 *   node seeds/productSeeds.js --clear (clears existing data first)
 */

// ========================================
// SEED DATA: Product Definitions
// ========================================

const seedProducts = [
  // LAPTOPS
  {
    title: 'Dell XPS 15 Laptop',
    category: 'laptop',
    brand: 'Dell',
    description:
      'High-performance laptop with 15.6 inch 4K display, Intel i7 processor',
    unitPrice: 1500,
    discount: 100,
    initialStock: 25,
    minStock: 5,
    maxStock: 100,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/dell-xps-15.jpg',
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053491/dell-xps-15-2.jpg',
    ],
    specs: {
      processor: 'Intel Core i7-13700H',
      ram: '16GB DDR5',
      storage: '512GB SSD',
      display: '15.6" 4K OLED',
      graphics: 'NVIDIA RTX 4050',
      battery: '86Whr',
      weight: '2.0kg',
    },
  },
  {
    title: 'HP Pavilion 14 Gaming Laptop',
    category: 'laptop',
    brand: 'HP',
    description:
      'Budget gaming laptop with AMD Ryzen processor and dedicated graphics',
    unitPrice: 950,
    discount: 50,
    initialStock: 40,
    minStock: 10,
    maxStock: 150,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/hp-pavilion.jpg',
    ],
    specs: {
      processor: 'AMD Ryzen 5 7535HS',
      ram: '8GB DDR4',
      storage: '512GB SSD',
      display: '14" FHD 144Hz',
      graphics: 'NVIDIA GTX 1650',
      battery: '52.5Whr',
      weight: '1.6kg',
    },
  },
  {
    title: 'MacBook Air M2 Laptop',
    category: 'laptop',
    brand: 'Apple',
    description:
      'Ultra-thin laptop with Apple M2 chip and all-day battery life',
    unitPrice: 1200,
    initialStock: 15,
    minStock: 3,
    maxStock: 50,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/macbook-air-m2.jpg',
    ],
    specs: {
      processor: 'Apple M2',
      ram: '8GB Unified Memory',
      storage: '256GB SSD',
      display: '13.6" Liquid Retina',
      graphics: 'Apple M2 GPU',
      battery: '52.6Whr',
      weight: '1.24kg',
    },
  },
  {
    title: 'Lenovo ThinkPad X1 Carbon',
    category: 'laptop',
    brand: 'Lenovo',
    description: 'Business ultrabook with military-grade durability',
    unitPrice: 1800,
    discount: 200,
    initialStock: 12,
    minStock: 3,
    maxStock: 40,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/thinkpad-x1.jpg',
    ],
    specs: {
      processor: 'Intel Core i7-1365U',
      ram: '16GB LPDDR5',
      storage: '1TB SSD',
      display: '14" 2.8K OLED',
      graphics: 'Intel Iris Xe',
      battery: '57Whr',
      weight: '1.12kg',
    },
  },

  // DESKTOPS
  {
    title: 'Dell OptiPlex Desktop',
    category: 'desktop',
    brand: 'Dell',
    description:
      'Powerful business desktop with Intel Core i7 and expandability',
    unitPrice: 850,
    initialStock: 30,
    minStock: 8,
    maxStock: 120,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/dell-optiplex.jpg',
    ],
    specs: {
      processor: 'Intel Core i7-13700',
      ram: '16GB DDR4',
      storage: '512GB SSD + 1TB HDD',
      graphics: 'Intel UHD 770',
      ports: 'USB-C, USB 3.2, HDMI, DisplayPort',
      formFactor: 'Mini Tower',
    },
  },
  {
    title: 'HP Elite Desktop Workstation',
    category: 'desktop',
    brand: 'HP',
    description: 'Professional workstation for demanding applications',
    unitPrice: 1600,
    discount: 100,
    initialStock: 18,
    minStock: 5,
    maxStock: 60,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/hp-elite.jpg',
    ],
    specs: {
      processor: 'Intel Xeon W-1370P',
      ram: '32GB DDR4 ECC',
      storage: '1TB NVMe SSD',
      graphics: 'NVIDIA RTX A2000',
      ports: 'Thunderbolt 4, USB 3.2',
      formFactor: 'Tower',
    },
  },
  {
    title: 'Custom Gaming Desktop PC',
    category: 'desktop',
    brand: 'Custom Build',
    description: 'High-end gaming PC with RGB lighting and liquid cooling',
    unitPrice: 2200,
    discount: 200,
    initialStock: 8,
    minStock: 2,
    maxStock: 30,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/gaming-pc.jpg',
    ],
    specs: {
      processor: 'AMD Ryzen 9 7950X',
      ram: '32GB DDR5',
      storage: '2TB NVMe Gen4 SSD',
      graphics: 'NVIDIA RTX 4070 Ti',
      cooling: 'AIO Liquid Cooler',
      psu: '850W 80+ Gold',
      case: 'RGB Tempered Glass',
    },
  },

  // CCTV CAMERAS
  {
    title: 'HikVision Dome Camera',
    category: 'cctv',
    brand: 'HikVision',
    description:
      '4MP DeepinView Fixed Lens Dome Camera for Perimeter Protection',
    unitPrice: 250,
    initialStock: 50,
    minStock: 15,
    maxStock: 200,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/hikvision-dome.jpg',
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053491/hikvision-dome-2.jpg',
    ],
    specs: {
      resolution: '4MP (2560×1440)',
      lens: 'Fixed 2.8mm',
      nightVision: true,
      irRange: '30m',
      connectivity: 'PoE (Power over Ethernet)',
      weatherproof: 'IP67',
      videoCompression: 'H.265+',
    },
  },
  {
    title: 'Dahua Bullet Camera',
    category: 'cctv',
    brand: 'Dahua',
    description: '5MP Starlight Bullet Camera with Smart IR technology',
    unitPrice: 280,
    discount: 20,
    initialStock: 35,
    minStock: 10,
    maxStock: 150,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/dahua-bullet.jpg',
    ],
    specs: {
      resolution: '5MP (2880×1620)',
      lens: 'Varifocal 2.7-13.5mm',
      nightVision: true,
      irRange: '50m',
      connectivity: 'PoE',
      weatherproof: 'IP67',
      videoCompression: 'H.265',
    },
  },
  {
    title: 'HikVision PTZ Camera',
    category: 'cctv',
    brand: 'HikVision',
    description: '4MP PTZ Camera with 25x optical zoom and auto-tracking',
    unitPrice: 850,
    discount: 50,
    initialStock: 12,
    minStock: 3,
    maxStock: 50,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/hikvision-ptz.jpg',
    ],
    specs: {
      resolution: '4MP',
      zoom: '25x Optical',
      pan: '360°',
      tilt: '90°',
      nightVision: true,
      irRange: '150m',
      connectivity: 'PoE+',
      weatherproof: 'IP66',
      autoTracking: true,
    },
  },
  {
    title: 'Axis Network Camera',
    category: 'cctv',
    brand: 'Axis',
    description: 'Premium 4K network camera with analytics and WDR',
    unitPrice: 650,
    initialStock: 20,
    minStock: 5,
    maxStock: 80,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/axis-camera.jpg',
    ],
    specs: {
      resolution: '4K (3840×2160)',
      lens: 'Fixed 3.9mm',
      nightVision: true,
      wdr: 'Wide Dynamic Range',
      connectivity: 'PoE',
      weatherproof: 'IP66',
      analytics: 'Built-in AI',
      audio: 'Two-way',
    },
  },
  {
    title: 'Budget CCTV Kit 4 Camera System',
    category: 'cctv',
    brand: 'Generic',
    description: 'Complete 4-camera CCTV system with DVR and cables',
    unitPrice: 450,
    discount: 50,
    initialStock: 25,
    minStock: 8,
    maxStock: 100,
    images: [
      'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758053490/cctv-kit.jpg',
    ],
    specs: {
      cameras: '4x 2MP Dome',
      dvr: '4-Channel 1080P',
      storage: '1TB HDD Included',
      nightVision: true,
      cables: '4x 20m Cables',
      monitor: 'HDMI Output',
      mobileApp: 'iOS/Android',
    },
  },
];

// ========================================
// SEED FUNCTIONS
// ========================================

/**
 * Clear existing data
 */
async function clearData() {
  console.log('🗑️  Clearing existing data...');

  await Product.deleteMany({});
  await Stock.deleteMany({});
  await StockMovement.deleteMany({});

  console.log('✅ Existing data cleared\n');
}

/**
 * Seed products with stock
 */
async function seedData() {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      console.log('🌱 Starting seed process...\n');

      let successCount = 0;
      let failCount = 0;

      for (const productData of seedProducts) {
        try {
          const {
            initialStock = 0,
            minStock = 10,
            maxStock = 1000,
            ...productFields
          } = productData;

          // Step 1: Create product
          const [product] = await Product.create([productFields], { session });

          // Step 2: Create stock record
          const [stock] = await Stock.create(
            [
              {
                product: product._id,
                quantity: initialStock,
                reserved: 0,
                minStock: minStock,
                maxStock: maxStock,
                lastRestocked: initialStock > 0 ? new Date() : null,
              },
            ],
            { session },
          );

          // Step 3: Create initial stock movement (if stock > 0)
          if (initialStock > 0) {
            await StockMovement.create(
              [
                {
                  product: product._id,
                  type: 'initial',
                  quantity: initialStock,
                  balanceBefore: 0,
                  balanceAfter: initialStock,
                  reason: 'Initial stock from seed data',
                  metadata: {
                    productTitle: product.title,
                    category: product.category,
                    seededAt: new Date(),
                  },
                },
              ],
              { session },
            );
          }

          successCount++;
          console.log(`✅ Created: ${product.title} (Stock: ${initialStock})`);
        } catch (error) {
          failCount++;
          console.error(`❌ Failed: ${productData.title}`);
          console.error(`   Error: ${error.message}`);
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log(`✅ Successfully seeded: ${successCount} products`);
      if (failCount > 0) {
        console.log(`❌ Failed: ${failCount} products`);
      }
      console.log('='.repeat(60) + '\n');
    });

    await session.endSession();
  } catch (error) {
    await session.endSession();
    console.error('❌ Seed transaction failed:', error);
    throw error;
  }
}

/**
 * Display summary statistics
 */
async function displaySummary() {
  console.log('📊 DATABASE SUMMARY:\n');

  const productCount = await Product.countDocuments();
  const stockCount = await Stock.countDocuments();
  const movementCount = await StockMovement.countDocuments();

  console.log(`   Products:        ${productCount}`);
  console.log(`   Stock Records:   ${stockCount}`);
  console.log(`   Stock Movements: ${movementCount}`);

  // Category breakdown
  const categories = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  console.log('\n📦 BY CATEGORY:');
  categories.forEach((cat) => {
    console.log(`   ${cat._id.padEnd(10)}: ${cat.count} products`);
  });

  // Stock summary
  const stockSummary = await Stock.aggregate([
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$quantity' },
        totalReserved: { $sum: '$reserved' },
        avgQuantity: { $avg: '$quantity' },
      },
    },
  ]);

  if (stockSummary.length > 0) {
    const summary = stockSummary[0];
    console.log('\n📈 STOCK SUMMARY:');
    console.log(`   Total Quantity:   ${summary.totalQuantity} units`);
    console.log(`   Total Reserved:   ${summary.totalReserved} units`);
    console.log(
      `   Available:        ${summary.totalQuantity - summary.totalReserved} units`,
    );
    console.log(
      `   Average per Item: ${Math.round(summary.avgQuantity)} units`,
    );
  }

  console.log('\n');
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main() {
  try {
    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI || process.env.DB;
    try {
      // Build DB connection string
      let dbUri = process.env.DB;
      if (!dbUri) {
        console.error(
          '❌ MongoDB connection string is missing! Please set DB in your .env file.',
        );
        process.exit(1);
      }
      if (dbUri.includes('<PASSWORD>')) {
        if (!process.env.PASSWORD) {
          console.error('❌ PASSWORD environment variable is missing!');
          process.exit(1);
        }
        dbUri = dbUri.replaceAll('<PASSWORD>', process.env.PASSWORD);
      }

      // Connect to MongoDB
      await mongoose.connect(dbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB\n');

      // Check for --clear flag
      if (process.argv.includes('--clear')) {
        await clearData();
      }

      // Seed data
      await seedData();

      // Display summary
      await displaySummary();

      // Disconnect
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB\n');

      process.exit(0);
    } catch (error) {
      console.error('❌ Seed script failed:', error);
      await mongoose.disconnect();
      process.exit(1);
    }
  } finally {
    console.log('done');
  }
}
main();
