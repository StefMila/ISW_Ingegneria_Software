import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
// Serve per creare un gruppo di route dedicate all’autenticazione. Così non mettiamo tutto dentro a index.js
const router = express.Router();

// Route per la registrazione di un nuovo utente --> risponde a POST su /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, surname, email, password, userType } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    // Controllo che email e password siano presenti
    if (!name || !surname || !normalizedEmail || !password || !userType) {
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
    if (!emailRegex.test(normalizedEmail)) {
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
    const existingUser = await User.findOne({ email: normalizedEmail });

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
      email: normalizedEmail,
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
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Controllo che email e password siano presenti
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: 'Email e password sono obbligatori'
      });
    }
    // Controllo se esiste un utente con l'email fornita
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        message: 'Email non valida'
      });
    }
    // Confronto la password fornita con l'hash salvato nel database (password in chiaro nel login e quella has salavata in DB) 
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Password non valida'
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
      token, 
      userType: user.userType
    });
  } catch (error) {
    console.error('Errore durante il login:', error);
    return res.status(500).json({
      message: 'Errore interno del server'
    });
  }
});
// Route per il logout di un utente --> risponde a POST su /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    
  //TODO (security) In un'implementazione stateless con JWT, il logout è gestito lato client eliminando il token.
  //TODO (security) In un'implementazione stateful, si potrebbe invalidare il token lato server (es. blacklist).
  return res.status(200).json({
    message: 'Logout effettuato con successo'
  });
  } catch (error) {
    console.error('Errore durante il logout:', error);
    return res.status(500).json({
      message: 'Errore interno del server'
    });
  }
});

// Route per il recupero password --> risponde a POST su /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';


    // Controllo che l'email sia presente
    if (!normalizedEmail) {
      return res.status(400).json({
        message: 'Email è obbligatoria'
      });
    }
    // Controllo se esiste un utente con l'email fornita
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        message: 'Utente non trovato'
      });
    }
// TODO(security): introdurre token temporaneo di reset e scadenza
// TODO(security): integrare invio email per il recupero password
// TODO(security): evitare enumeration e abuso della funzionalità
// Per ora, rispondiamo sempre con successo per evitare enumeration, ma in un'implementazione reale dovremmo inviare un'email con un link di reset password

    return res.status(200).json({
      message: 'Email inserita correttamente, riceverai istruzioni per reimpostare la password'
    });
  } catch (error) {
    console.error('Errore durante il recupero password:', error);
    return res.status(500).json({
      message: 'Errore interno del server'
    });
  }
});

//Route per il reset password --> risponde a POST su /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    // Controllo che email e nuova password siano presenti
    if (!normalizedEmail || !newPassword) {
      return res.status(400).json({
        message: 'Email e nuova password sono obbligatorie'
      });
    }
    // Controllo se esiste un utente con l'email fornita
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        message: 'Utente non trovato'
      });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({
            message: 'La nuova password deve essere lunga almeno 8 caratteri.'
        });
    }
    // Creo l'hash della nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Aggiorno la password dell'utente nel database
    user.passwordHash = hashedPassword;
    await user.save();

    // TODO(security): sostituire il reset diretto con token temporaneo e scadenza
    // TODO(security): invalidare eventuali sessioni/token esistenti in una fase successiva

    return res.status(200).json({
      message: 'Password aggiornata con successo'
    });
  } catch (error) {
    console.error('Errore durante il reset password:', error);
    return res.status(500).json({
      message: 'Errore interno del server'
    });
  }
});





export default router;