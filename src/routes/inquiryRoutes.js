import express from 'express';
import Inquiry from '../models/Inquiry.js';
import Listing from '../models/Listing.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const { listingId, message } = req.body;

    if (!listingId || !message) {
      return res
        .status(400)
        .json({ message: 'Listing ID and message are required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      return res
        .status(400)
        .json({ message: 'This listing is no longer active' });
    }

    if (listing.seller.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: 'You cannot inquire on your own listing' });
    }

    const existingInquiry = await Inquiry.findOne({
      listing: listingId,
      buyer: req.user._id,
    });
    if (existingInquiry) {
      return res
        .status(400)
        .json({ message: 'You already sent an inquiry for this listing' });
    }

    const inquiry = await Inquiry.create({
      listing: listingId,
      buyer: req.user._id,
      seller: listing.seller,
      message,
    });

    await inquiry.populate([
      { path: 'listing', select: 'title price images' },
      { path: 'buyer', select: 'name avatarUrl' },
    ]);

    res.status(201).json({ inquiry });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/inbox', protect, async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .populate('listing', 'title price images')
      .populate('buyer', 'name avatarUrl');

    res.json({ inquiries });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/sent', protect, async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('listing', 'title price images status')
      .populate('seller', 'name avatarUrl');

    res.json({ inquiries });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/respond', protect, async (req, res) => {
  try {
    const { status, sellerReply } = req.body;

    if (!['accepted', 'declined'].includes(status)) {
      return res
        .status(400)
        .json({ message: 'Status must be accepted or declined' });
    }

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    if (inquiry.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (inquiry.status !== 'pending') {
      return res
        .status(400)
        .json({ message: 'This inquiry has already been responded to' });
    }

    inquiry.status = status;
    if (sellerReply) inquiry.sellerReply = sellerReply;
    if (status === 'accepted') inquiry.contactRevealed = true;

    await inquiry.save();

    await inquiry.populate([
      { path: 'listing', select: 'title price images' },
      { path: 'buyer', select: 'name avatarUrl email' },
    ]);

    res.json({ inquiry });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('listing', 'title price images status')
      .populate('buyer', 'name avatarUrl email')
      .populate('seller', 'name avatarUrl email');

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    const isInvolved =
      inquiry.buyer._id.toString() === req.user._id.toString() ||
      inquiry.seller._id.toString() === req.user._id.toString();

    if (!isInvolved) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!inquiry.contactRevealed) {
      inquiry.seller.email = undefined;
      inquiry.buyer.email = undefined;
    }

    res.json({ inquiry });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;