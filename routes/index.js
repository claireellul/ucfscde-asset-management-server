const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

router.get('/', (req, res) => {
  res.json({message:'The server is running'});
});

router.post(
  '/',
  [
    body('name')
      .isLength({ min: 1 })
      .withMessage('Please enter a name'),
    body('email')
      .isLength({ min: 1 })
      .withMessage('Please enter an email'),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      res.json('Thank you for your registration!');
    } else {
      res.json({ error: errors });
    }
  }
);

module.exports = router;