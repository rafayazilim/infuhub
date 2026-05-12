import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import CampaignForm from './CampaignForm';
import { createCampaign, Campaign } from '@/services/campaignService';
import { trackEvent } from '@/utils/metaPixel';

interface CampaignNewProps {
  brandId: string;
}

export default function CampaignNew({ brandId }: CampaignNewProps) {
  const navigate = useNavigate();

  const handleSubmit = async (data: Campaign) => {
    await createCampaign(data);
    trackEvent('CreateCampaign');
    navigate('/brand/campaigns');
  };

  const handleCancel = () => {
    navigate('/brand/campaigns');
  };

  return (
    <DashboardLayout>
      <CampaignForm
        brandId={brandId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </DashboardLayout>
  );
}

