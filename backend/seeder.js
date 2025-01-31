// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import colors from "colors";
// import users from "./data/users.js";
// import User from "./models/userModel.js";
// import connectDB from "./config/db.js";

// dotenv.config();

// connectDB();

// const importData = async () => {
//     try {
//         /* Will delete the Orders, Products and Users */
//        // await Order.deleteMany();
//        // await Product.deleteMany();
//         await User.deleteMany();
//         /* Will create the Users */
//         const createdUsers = await User.insertMany(users);
//         /* Takes the Admin user */
//        // const adminUser = createdUsers[0]._id;

//         /* Will create the product as an Admin */
//         // const sampleProducts = products.map((product) => {
//         //   return { ...product, user: adminUser };
//         // });

//         // await Product.insertMany(sampleProducts);

//         console.log('Data Imported!'.green.inverse);
//         process.exit();
//     } catch (error) {
//         console.error(`${error}`.red.inverse);
//         process.exit(1);
//     }
// };

// const destroyData = async () => {
//     try {
//        // await Order.deleteMany();
//        // await Product.deleteMany();
//         await User.deleteMany(); 

//         console.log('Data Destroyed!'.red.inverse);
//         process.exit();
//     } catch (error) {
//         console.error(`${error}`.red.inverse);
//         process.exit(1);
//     }
// };

// if (process.argv[2] === '-d') {
//     destroyData();
// } else {
//     importData();
// }




import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import bcrypt from 'bcryptjs';

dotenv.config();
connectDB();

const users = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@email.com",
    password: bcrypt.hashSync("123456", 10), 
  },
  {
    id: 2,
    name: "John Doe",
    email: "john@email.com",
    password: bcrypt.hashSync("password", 10),
  },
];

const importData = async () => {
  try {
    await User.deleteMany(); // Clears previous users
    await User.insertMany(users);
    console.log("Users seeded successfully!");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
