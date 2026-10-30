import { buildPlantQrUrl } from '@growlog/domain';
import QRCode from 'qrcode';

export async function plantLabelQrDataUrl(params: { farmId: string; plantId: string }): Promise<string> {
  const url = buildPlantQrUrl(params);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });
}
