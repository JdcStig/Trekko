import bcrypt from 'bcryptjs';

const users = [
   {
       id: '1',
       name: 'Admin User',
       email: 'admin@email.com',
       password: bcrypt.hashSync('123456', 10),
   },
   {
       id: '2',
       name: 'John Doe',
       email: 'john@email.com',
       password: bcrypt.hashSync('123456', 10),
   },
   {
       id: '3',
       name: 'Jane Doe',
       email: 'jane@email.com',
       password: bcrypt.hashSync('123456', 10),
   }
];

export default users;