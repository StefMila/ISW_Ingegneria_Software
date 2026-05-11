import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

    const allowedUserTypes = ['allevatore', 'veterinario', 'consumatore'];
    if (!allowedUserTypes.includes(userType)) {
        return res.status(400).json({
            message: `ruolo non valido.`
        });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'Email non valida.'
        });
    }
    if (password.length < 8) {
        return res.status(400).json({
            message: 'La password deve essere lunga almeno 8 caratteri.'
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

// Route per il login di un utente --> risponde a POST su /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Controllo che email e password siano presenti
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email e password sono obbligatori'
      });
    }
    // Controllo se esiste un utente con l'email fornita
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Credenziali non valide'
      });
    }
    // Confronto la password fornita con l'hash salvato nel database (password in chiaro nel login e quella has salavata in DB) 
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Credenziali non valide'
      });
    }
    // Se le credenziali sono valide, creo un token JWT
    const token = jwt.sign(
      { userId: user._id, 
        email: user.email, 
        userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO(security): valutare rate limiting o blocco temporaneo dopo tentativi di login falliti ripetuti
    // TODO(authz): i controlli avanzati sui ruoli saranno applicati nelle route protette
    // TODO(security): valutare refresh token e revoca token in una fase successiva


    return res.status(200).json({
      message: 'Login effettuato con successo',
      token
    });
  } catch (error) {
    console.error('Errore durante il login:', error);
    return res.status(500).json({
      message: 'Errore interno del server'
    });
  }
});



export default router;