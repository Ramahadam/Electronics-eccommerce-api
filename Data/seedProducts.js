const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Product = require('../models/productModels');

dotenv.config({ path: `${__dirname}/../config.env` });

await connectDB();

const images = [
  'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758397085/gni4nkmfy9n8k2j6zwsj.jpg',
  'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758397086/inxy7yeav7gckuntpfr3.jpg',
  'https://res.cloudinary.com/dbzs4nok9/image/upload/v1758397086/hwnyblxzkl6oehtvk0lo.jpg',
];

const categories = ['laptop', 'desktop', 'cctv', 'printer'];

const laptopTitles = [
  'HP ProBook 460 G11',
  'Dell Latitude 5440',
  'Lenovo ThinkPad E14',
  'ASUS VivoBook 15',
  'Acer Aspire 7',
];

const desktopTitles = [
  'Dell OptiPlex 7010',
  'HP EliteDesk 800',
  'Lenovo ThinkCentre M70',
  'ASUS ExpertCenter D5',
  'Acer Veriton X',
];

const cctvTitles = [
  'HikVision Dome Camera',
  'Dahua Bullet Camera',
  'TP-Link Tapo C320',
  'Uniview IP Camera',
  'EZVIZ Outdoor Camera',
];

const printerTitles = [
  'HP LaserJet Pro M404',
  'Canon PIXMA G3420',
  'Brother HL-L2350DW',
  'Epson EcoTank L3250',
  'Samsung Xpress M2020',
];

const descriptions = {
  laptop:
    'High-performance laptop designed for productivity, multitasking, and daily professional use.',
  desktop:
    'Reliable desktop computer built for office workloads, stability, and long-term performance.',
  cctv: 'Advanced surveillance camera offering night vision, motion detection, and secure monitoring.',
  printer:
    'Efficient printer delivering high-quality prints with low operating cost and fast output.',
};

const brands = {
  laptop: ['HP', 'Dell', 'Lenovo', 'ASUS', 'Acer'],
  desktop: ['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer'],
  cctv: ['HikVision', 'Dahua', 'TP-Link', 'Uniview', 'EZVIZ'],
  printer: ['HP', 'Canon', 'Brother', 'Epson', 'Samsung'],
};

const products = Array.from({ length: 50 }).map((_, i) => {
  const category = categories[i % categories.length];

  let titlePool;
  switch (category) {
    case 'laptop':
      titlePool = laptopTitles;
      break;
    case 'desktop':
      titlePool = desktopTitles;
      break;
    case 'cctv':
      titlePool = cctvTitles;
      break;
    case 'printer':
      titlePool = printerTitles;
      break;
  }

  return {
    title: `${titlePool[i % titlePool.length]} (${2022 + (i % 4)})`,
    images,
    category,
    brand: brands[category][i % brands[category].length],
    unitPrice: 500 + i * 30,
    stock: 5 + (i % 15),
    description: descriptions[category],
    specs: {
      resolution: category === 'cctv' ? '4K' : '1080p',
      connectivity: category === 'printer' ? 'Wireless' : 'Wired',
      nightVision: category === 'cctv',
    },
  };
});

const seedData = async () => {
  try {
    await Product.deleteMany();

    console.log(products);
    await Product.create(products);
    console.log('✅ 50 diverse products seeded successfully');
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};

seedData();
