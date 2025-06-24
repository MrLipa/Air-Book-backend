const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const getAllUsers = async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM users');
    const users = results.map((user) => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      address: user.address,
      description: user.description,
      role: user.role,
    }));
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const id = req.params.userId;
    const [userQuery] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (userQuery.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userQuery[0];
    const modifiedUser = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      address: user.address,
      description: user.description,
      role: user.role,
    };
    res.json(modifiedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createNewUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, image, phone, address, description, role = 'none' } = req.body;
    if (!firstName || !lastName || !email || !password || !image || !phone || !address) {
      return res.status(400).json({
        message: 'firstName, lastName, email, password, image, phone, and address are required.',
      });
    }

    const [existing] = await pool.execute('SELECT 1 FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newId = uuidv4();
    const query = `
      INSERT INTO users (id, first_name, last_name, email, password, image, phone, address, description, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [newId, firstName, lastName, email, hashedPassword, image, phone, address, description, role];
    await pool.execute(query, values);

    res.status(201).json({ message: 'User created', id: newId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateUserById = async (req, res) => {
  try {
    const id = req.params.userId;
    const { firstName, lastName, email, password, image, phone, address, description, role } = req.body;
    const requiredFields = { firstName, lastName, email, password, image, phone, address };
    const missingFields = Object.entries(requiredFields).filter(([_, val]) => !val);
    if (missingFields.length > 0) {
      return res.status(400).json({ message: 'All required fields must be provided and not empty.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      UPDATE users SET first_name = ?, last_name = ?, email = ?, password = ?, image = ?, phone = ?, address = ?, description = ?, role = ?
      WHERE id = ?
    `;
    const values = [firstName, lastName, email, hashedPassword, image, phone, address, description, role, id];
    await pool.execute(query, values);

    res.status(200).json({ message: 'User updated', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const patchUserById = async (req, res) => {
  try {
    const id = req.params.userId;
    const updateFields = req.body;
    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      password: 'password',
      image: 'image',
      phone: 'phone',
      address: 'address',
      description: 'description',
      role: 'role',
    };

    const entries = Object.entries(updateFields)
      .filter(([key, value]) => fieldMap[key] && value !== null && value !== undefined && value !== '')
      .map(([key, value]) => [fieldMap[key], value]);

    if (!entries.length) {
      return res.status(400).json({ message: 'No valid fields to update (null or empty).' });
    }

    for (let i = 0; i < entries.length; i++) {
      if (entries[i][0] === 'password') {
        entries[i][1] = await bcrypt.hash(entries[i][1], 10);
      }
    }

    const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, value]) => value);
    const query = `UPDATE users SET ${setClauses} WHERE id = ?`;

    values.push(id);
    await pool.execute(query, values);

    res.status(200).json({ message: 'User patched', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteUserById = async (req, res) => {
  try {
    const id = req.params.userId;
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createNotification = async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ message: 'userId and message are required.' });
    }
    const notificationId = uuidv4();
    await pool.execute(`INSERT INTO notifications (id, user_id, message) VALUES (?, ?, ?)`, [notificationId, userId, message]);
    res.status(201).json({ message: 'Notification created', notificationId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createReservation = async (req, res) => {
  try {
    const { userId, flightId } = req.body;
    if (!userId || !flightId) {
      return res.status(400).json({ message: 'userId and flightId are required' });
    }
    const reservationId = uuidv4();
    await pool.execute(`INSERT INTO reservations (id, user_id, flight_id) VALUES (?, ?, ?)`, [reservationId, userId, flightId]);
    res.status(201).json({ message: 'Reservation created', reservationId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteReservationById = async (req, res) => {
  try {
    const reservationId = req.params.reservationId;
    const [reservationResult] = await pool.execute('SELECT flight_id FROM reservations WHERE id = ?', [reservationId]);
    if (reservationResult.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    await pool.execute('DELETE FROM reservations WHERE id = ?', [reservationId]);
    res.status(200).json({ message: 'Reservation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getNotificationsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const [dbResult] = await pool.execute('SELECT message, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    if (dbResult.length === 0) {
      return res.json([]);
    }
    res.status(200).json(
      dbResult.map((row) => ({
        message: row.message,
        created_at: row.created_at,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createNewUser,
  updateUserById,
  patchUserById,
  deleteUserById,
  createNotification,
  createReservation,
  deleteReservationById,
  getNotificationsByUserId,
};
