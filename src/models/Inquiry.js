import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    sellerReply: {
      type: String,
      trim: true,
      maxlength: [500, 'Reply cannot exceed 500 characters'],
      default: '',
    },
    contactRevealed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

inquirySchema.index({ listing: 1 });
inquirySchema.index({ buyer: 1 });
inquirySchema.index({ seller: 1 });

const Inquiry = mongoose.model('Inquiry', inquirySchema);

export default Inquiry;