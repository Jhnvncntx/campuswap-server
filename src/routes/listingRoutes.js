import express from 'express';
import Listing from '../models/Listing.js';
import protect from '../middleware/authMiddleware.js';
import { upload, uploadToCloudinary } from '../config/cloudinary.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    const query = { status: 'active' };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'price-low': { price: 1 },
      'price-high': { price: -1 },
    };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Listing.countDocuments(query);

    const listings = await Listing.find(query)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(skip)
      .limit(Number(limit))
      .populate('seller', 'name avatarUrl');

    res.json({
      listings,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/my-listings', protect, async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ listings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      'seller',
      'name avatarUrl email'
    );
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    res.json({ listing });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', protect, upload.array('images', 5), async (req, res) => {
    try {
      const { title, description, category, condition, price, tags } = req.body;
  
      if (!title || !description || !category || !condition || !price) {
        return res.status(400).json({ message: 'All fields are required' });
      }
  
      const images = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const result = await uploadToCloudinary(req.files[i].buffer);
          images.push({
            url: result.secure_url,
            publicId: result.public_id,
            order: i,
          });
        }
      }
  
      const listing = await Listing.create({
        seller: req.user._id,
        title,
        description,
        category,
        condition,
        price: Number(price),
        images,
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      });
  
      res.status(201).json({ listing });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

router.put('/:id', protect, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, category, condition, price, tags, status } =
      req.body;

    if (title) listing.title = title;
    if (description) listing.description = description;
    if (category) listing.category = category;
    if (condition) listing.condition = condition;
    if (price) listing.price = Number(price);
    if (tags) listing.tags = tags.split(',').map((t) => t.trim());
    if (status) listing.status = status;

    const updated = await listing.save();
    res.json({ listing: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (listing.images.length > 0) {
      await Promise.all(
        listing.images.map((img) => cloudinary.uploader.destroy(img.publicId))
      );
    }

    await listing.deleteOne();
    res.json({ message: 'Listing deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;