import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { reports: true } } }
    });
    res.json(clients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { reports: { orderBy: { createdAt: 'desc' } } }
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const {
      name, mobile, email, aadhaar, pan, gst,
      address, city, district, state, pincode,
      businessName, constitution, industryType, businessActivity,
      dateOfIncorporation, isExistingBusiness, udyamNumber, cinNumber,
      promoterName, promoterExperience, existingBanker, existingLoanDetails,
      userId
    } = req.body;

    // Ensure user exists (upsert by firebaseUid for local dev)
    let user = await prisma.user.findFirst({ where: { firebaseUid: userId || 'local-dev' } });
    if (!user) {
      user = await prisma.user.create({
        data: { firebaseUid: userId || 'local-dev', email: email || 'dev@cma.local', name: 'Dev User' }
      });
    }

    const client = await prisma.client.create({
      data: {
        userId: user.id,
        name, mobile, email, aadhaar, pan, gst,
        address, city, district, state, pincode,
        businessName, constitution, industryType, businessActivity,
        dateOfIncorporation: dateOfIncorporation ? new Date(dateOfIncorporation) : undefined,
        isExistingBusiness: isExistingBusiness ?? true,
        udyamNumber, cinNumber,
        promoterName, promoterExperience: promoterExperience ? parseInt(promoterExperience) : undefined,
        existingBanker, existingLoanDetails
      }
    });
    res.status(201).json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  try {
    const { dateOfIncorporation, ...rest } = req.body;
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        dateOfIncorporation: dateOfIncorporation ? new Date(dateOfIncorporation) : undefined,
      }
    });
    res.json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
