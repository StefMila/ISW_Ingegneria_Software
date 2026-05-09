import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
// Serve per creare un gruppo di route dedicate all’autenticazione. Così non mettiamo tutto dentro a index.js
const router = express.Router();

// Route per la registrazione di un nuovo utente --> risponde a POST su /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, surname, email, password, userType } = req.body;
    // Controllo che email e password siano presenti
    if (!name || !surname || !email || !password || !userType) {
      return res.status(400).json({
        message: 'Name, surname, email, password e userType sono obbligatori'
      });
    }

    // Controllo se esiste già un utente con la stessa email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: 'Utente già esistente'
      });
    }

    // Creo l'hash della password. Trasforma la password in una stringa cifrata di difficoltà 10
    const hashedPassword = await bcrypt.hash(password, 10);


    // Creo il nuovo utente. Nuovo documento MongoDB e lo salvi.
    const newUser = new User({
      name,
      surname,
      email,
      passwordHash: hashedPassword,
      userType
    });

    // Salvo l'utente nel database
    await newUser.save();

    return res.status(201).json({
      message: 'Utente registrato con successo'
    });
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    return res.status(500).json({
      message: 'Errore interno del server'
    });
  }
});

export default router;