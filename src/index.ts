import qrcode from 'qrcode';
import { crc } from 'polycrc';
import { string, number, boolean } from 'yup';

interface QrCodePixParams {
    version: string;
    key: string;
    city: string;
    name: string;
    value?: number;
    guid?: string;
    message?: string;
    cep?: string;
    notRepeatPayment?: boolean;
    currency?: number;
    countryCode?: string;
}

function QrCodePix({
    version,
    key,
    city,
    name,
    value,
    guid,
    message,
    cep,
    notRepeatPayment,
    currency = 986,
    countryCode = 'BR',
}: QrCodePixParams) {
    string().equals(['01'], 'Version not supported').validateSync(version);

    string()
        .min(2, 'countryCode: 2 characters')
        .max(2, 'countryCode: 2 characters')
        .nullable()
        .validateSync(countryCode);

    string().min(8, 'cep: 8 characters').max(8, 'cep: 8 characters').nullable().validateSync(cep);

    number().nullable().validateSync(value);

    boolean().nullable().validateSync(notRepeatPayment);

    const payloadKeyString = generateKey(key, message);

    const payload: string[] = [
        genEMV('00', version),
        genEMV('01', !notRepeatPayment ? '11' : '12'),
        genEMV('26', payloadKeyString),
        genEMV('52', '0000'),
        genEMV('53', String(currency)),
    ];

    if (value) {
        payload.push(genEMV('54', value.toFixed(2)));
    }

    payload.push(genEMV('58', countryCode.toUpperCase()));
    payload.push(genEMV('59', name));
    payload.push(genEMV('60', city.toUpperCase()));

    if (cep) {
        payload.push(genEMV('61', cep));
    }

    if (guid) {
        payload.push(genEMV('62', genEMV('05', guid)));
    }

    payload.push('6304');

    const stringPayload = payload.join('');
    const buffer = Buffer.from(stringPayload, 'utf8');

    const crc16CCiTT = crc(16, 0x1021, 0xffff, 0x0000, false);
    const crcResult = crc16CCiTT(buffer).toString(16).toUpperCase();

    const payloadPIX = `${stringPayload}${crcResult}`;

    return {
        payload: () => payloadPIX,
        base64: () => qrcode.toDataURL(payloadPIX),
    };
}

function generateKey(key: string, message?: string): string {
    const payload: string[] = [genEMV('00', 'BR.GOV.BCB.PIX'), genEMV('01', key)];
    if (message) {
        payload.push(genEMV('02', message));
    }
    return payload.join('');
}

function genEMV(id: string, parameter: string): string {
    const len = parameter.length.toString().padStart(2, '0');
    return `${id}${len}${parameter}`;
}

export { QrCodePixParams, QrCodePix };
