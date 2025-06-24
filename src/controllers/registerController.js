const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { registerSchema } = require('../validations/userValidation');
const { v4: uuidv4 } = require('uuid');

const registerUser = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { firstName, lastName, email, password, role } = value;

    const [existingUser] = await pool.execute('SELECT 1 FROM users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.execute(
      `INSERT INTO users (id, first_name, last_name, email, password, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, firstName, lastName, email, hashedPassword, role]
    );

    res.status(201).json({ message: `✅ User '${email}' successfully registered.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  registerUser,
};
