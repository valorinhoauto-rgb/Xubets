/**
 * Simple PIX Payload Generator (Static)
 * Based on BRCode / EMV QRCPS Merchant-Presented Mode
 */

interface PixOptions {
  key: string;
  name: string;
  city: string;
  amount?: number;
  description?: string;
  transactionId?: string;
}

export function generatePixPayload({
  key,
  name,
  city,
  amount,
  description,
  transactionId = '***'
}: PixOptions): string {
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const sanitizedKey = key.includes('@') ? key : key.replace(/[^a-zA-Z0-9]/g, '');
  const gui = 'br.gov.bcb.pix';
  const merchantAccountInfo = formatField('00', gui) + formatField('01', sanitizedKey) + (description ? formatField('02', description) : '');

  const payload = [
    formatField('00', '01'), // Payload Format Indicator
    formatField('26', merchantAccountInfo), // Merchant Account Information
    formatField('52', '0000'), // Merchant Category Code
    formatField('53', '986'), // Transaction Currency (BRL)
    amount ? formatField('54', amount.toFixed(2)) : '', // Transaction Amount
    formatField('58', 'BR'), // Country Code
    formatField('59', name.substring(0, 25)), // Merchant Name
    formatField('60', city.substring(0, 15)), // Merchant City
    formatField('62', formatField('05', transactionId.substring(0, 25))), // Additional Data Field Template
  ].join('');

  const crc16 = (data: string) => {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < data.length; i++) {
      let b = data.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        let bit = ((b >> (7 - j)) & 1) === 1;
        let c15 = ((crc >> 15) & 1) === 1;
        crc <<= 1;
        if (c15 !== bit) crc ^= polynomial;
      }
    }

    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  };

  const finalPayload = payload + '6304';
  return finalPayload + crc16(finalPayload);
}
