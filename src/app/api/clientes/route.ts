import { NextResponse } from 'next/server';
import { getClientes, getClienteByTel, crearCliente } from '@/lib/sheets';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tel = searchParams.get('telefono');
        if (tel) {
            const cliente = await getClienteByTel(tel);
            return NextResponse.json({ cliente });
        }
        const clientes = await getClientes();
        return NextResponse.json({ clientes });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // Calcular signo zodiacal del cumpleaños
        const signo = calcularSigno(body.cumpleanos);
        const fecha = new Date().toLocaleDateString('es-MX');
        await crearCliente({
            nombre: body.nombre,
            telefono: body.telefono,
            signo,
            bebidaFavorita: body.bebidaFavorita || '',
            cumpleanos: body.cumpleanos || '',
            visitas: 1,
            ultimaVisita: fecha,
            totalGastado: 0,
            puntos: 0,
            nivel: 'BASE',
            fechaRegistro: fecha,
        });
        return NextResponse.json({ ok: true, signo });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

function calcularSigno(cumpleanos: string): string {
    if (!cumpleanos) return '';
    const parts = cumpleanos.split(/[\/\-\.]/);
    if (parts.length < 2) return '';
    const dia = parseInt(parts[0]);
    const mes = parseInt(parts[1]);
    const signosEn: Record<string, string> = {
        aries: 'Aries', taurus: 'Tauro', gemini: 'Géminis', cancer: 'Cáncer',
        leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Escorpio',
        sagittarius: 'Sagitario', capricorn: 'Capricornio', aquarius: 'Acuario', pisces: 'Piscis'
    };
    let en = '';
    if (mes === 1) en = dia <= 19 ? 'capricorn' : 'aquarius';
    else if (mes === 2) en = dia <= 18 ? 'aquarius' : 'pisces';
    else if (mes === 3) en = dia <= 20 ? 'pisces' : 'aries';
    else if (mes === 4) en = dia <= 19 ? 'aries' : 'taurus';
    else if (mes === 5) en = dia <= 20 ? 'taurus' : 'gemini';
    else if (mes === 6) en = dia <= 20 ? 'gemini' : 'cancer';
    else if (mes === 7) en = dia <= 22 ? 'cancer' : 'leo';
    else if (mes === 8) en = dia <= 22 ? 'leo' : 'virgo';
    else if (mes === 9) en = dia <= 22 ? 'virgo' : 'libra';
    else if (mes === 10) en = dia <= 22 ? 'libra' : 'scorpio';
    else if (mes === 11) en = dia <= 21 ? 'scorpio' : 'sagittarius';
    else if (mes === 12) en = dia <= 21 ? 'sagittarius' : 'capricorn';
    return signosEn[en] || '';
}
