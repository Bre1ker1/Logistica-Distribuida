import mongoose from 'mongoose';

const trackingEventSchema = new mongoose.Schema({
  guia: { type: String, required: true },
  status: { type: String, required: true },
  location: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('TrackingEvent', trackingEventSchema);