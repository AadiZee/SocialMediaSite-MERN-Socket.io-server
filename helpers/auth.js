import bcrypt from "bcrypt";

//creating hashed password while registering
export const HashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(12, (err, salt) => {
      if (err) {
        reject(err);
      }
      bcrypt.hash(password, salt, (err, hashedPass) => {
        if (err) {
          reject(err);
        }
        resolve(hashedPass);
      });
    });
  });
};

//comparing entered password to hashed password present in database
export const ComparePassword = (password, hashPassword) => {
  return bcrypt.compare(password, hashPassword);
};
