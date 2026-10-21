import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema({
  guia: { type: String, required: true, unique: true },
  weight: { type: Number, required: true },
  destinationCp: { type: String, required: true },
  cost: { type: Number, required: true },
  status: { type: String, default: 'PENDIENTE' }
});

export default mongoose.model('Shipment', shipmentSchema);