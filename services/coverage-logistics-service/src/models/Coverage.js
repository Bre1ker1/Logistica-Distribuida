import mongoose from 'mongoose';

const coverageSchema = new mongoose.Schema({
  cp: { type: String, required: true, unique: true },
  zoneName: { type: String, required: true },
  active: { type: Boolean, default: true },
  hubId: { type: String, required: true }
});

export default mongoose.model('Coverage', coverageSchema);