#!/bin/bash

# Deploy Ad Controller Fix to VPS
# This updates the adController.ts file on the VPS

echo "🚀 Deploying Ad Controller Fix..."

# Navigate to backend directory
cd /root/freedash2.0/backend/src/controllers

# Backup current file
echo "📦 Creating backup..."
cp adController.ts adController.ts.backup.$(date +%Y%m%d_%H%M%S)

# Update the createAd function
cat > /tmp/adController_createAd_fix.ts << 'EOF'
// Admin: Create a new ad
export const createAd = async (req: Request, res: Response) => {
    try {
        const { title, imageUrl, redirectUrl, rawCode, isAFK, position, positionIndex, priority, type, endDate, ownerId } = req.body;

        // Validate required fields
        if (!title || !position || !type) {
            return res.status(400).json({ message: 'Title, position, and type are required fields' });
        }

        // At least one of imageUrl or rawCode must be provided
        if (!imageUrl && !rawCode) {
            return res.status(400).json({ message: 'Either imageUrl or rawCode must be provided' });
        }

        // Automatically determine positionIndex if not provided
        let finalPositionIndex = positionIndex;
        if (finalPositionIndex === undefined || finalPositionIndex === null) {
            const maxIndexAd = await prisma.ad.findFirst({
                where: { position },
                orderBy: { positionIndex: 'desc' }
            });
            finalPositionIndex = maxIndexAd ? maxIndexAd.positionIndex + 1 : 0;
        }

        const ad = await prisma.ad.create({
            data: {
                title,
                imageUrl: imageUrl || null,
                redirectUrl: redirectUrl || null,
                rawCode: rawCode || null,
                isAFK: isAFK || false,
                position,
                positionIndex: finalPositionIndex,
                priority: priority || 1,
                type,
                endDate: endDate ? new Date(endDate) : null,
                ownerId: ownerId || null,
                status: 'active'
            }
        });

        res.status(201).json(ad);
    } catch (error: any) {
        console.error('Ad creation error:', error);
        res.status(500).json({ message: error.message || 'Failed to create ad' });
    }
};
EOF

# The file needs manual editing - display instructions
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "1. Open the file: /root/freedash2.0/backend/src/controllers/adController.ts"
echo "2. Find the createAd function (around line 43-69)"
echo "3. Replace it with the content from: /tmp/adController_createAd_fix.ts"
echo ""
echo "OR use this sed command to replace automatically:"
echo ""
echo "You can manually edit or copy the updated version from your local PC"
echo ""
echo "After updating, restart the backend:"
echo "  cd /root/freedash2.0"
echo "  docker-compose restart backend"
echo ""
