const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Draft = require('../models/Draft');

router.get('/users', async (req,res)=>{ res.json(await User.find().lean()); });
router.get('/drafts', async (req,res)=>{ res.json(await Draft.find().lean()); });

module.exports = router;
