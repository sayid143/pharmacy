import React, { forwardRef } from 'react';

const formatCurrency = (v) => `ETB ${parseFloat(v || 0).toFixed(2)}`;
const getTimestamp = (tx) => tx?.created_at || tx?.createdAt || tx?.date || new Date().toISOString();

// This component is strictly for generating the 80mm thermal print layout.
// It remains completely hidden on screen.
const InvoiceReceipt = forwardRef(({ data }, ref) => {
    if (!data) return null;

    const items = data.cart ? data.cart.map(i => ({
        name: i.name || (i.medicine?.name || `Item #${i.id}`),
        selling_price: parseFloat(i.selling_price),
        quantity: parseInt(i.qty || i.quantity),
        subtotal: parseFloat(i.selling_price) * parseInt(i.qty || i.quantity)
    })) : (data.items || []).map(i => ({
        name: i.medicine?.name || `Item #${i.medicine_id}`,
        selling_price: parseFloat(i.selling_price),
        quantity: parseInt(i.quantity),
        subtotal: parseFloat(i.subtotal) || (parseFloat(i.selling_price) * parseInt(i.quantity))
    }));

    const invoiceNumber = data.invoice_number || 'N/A';

    const _subtotal = parseFloat(data.subtotal || data.total_amount || 0);
    const _taxAmt = parseFloat(data.taxAmt !== undefined ? data.taxAmt : data.tax_amount || 0);
    const _discountAmt = parseFloat(data.discountAmt !== undefined ? data.discountAmt : data.discount_amount || 0);
    const _total = parseFloat(data.total !== undefined ? data.total : data.total_amount || 0);
    const _paidAmt = parseFloat(data.paidAmt !== undefined ? data.paidAmt : data.amount_paid || 0);
    const _changeAmt = parseFloat(data.change_amount || 0);
    const _remaining = parseFloat(data.rem !== undefined ? data.rem : Math.max(0, _total - _paidAmt));

    const paymentMethod = (data.payment_method || data.paymentMethod || 'cash').replace('_', ' ');

    return (
        <div ref={ref} className="hidden print:block w-[80mm] bg-white text-black font-sans mx-auto p-0 text-[12px] leading-tight invoice-print-container">
            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-black uppercase tracking-widest text-black mb-1">
                    Pharmacare POS
                </h1>
                <p className="text-black font-bold text-[10px] uppercase tracking-wide">Pharmacy Billing System</p>
                <div className="mt-2 text-[11px] text-black font-medium">
                    <p>Jigjiga, Ethiopia</p>
                    <p>Phone: +251912345678</p>
                </div>
            </div>

            <div className="border-b-2 border-dashed border-black mb-3"></div>

            {/* Meta */}
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-[2px] mb-4 text-[11px] text-black">
                <span className="font-bold uppercase">Inv No:</span>
                <span className="font-bold text-right">{invoiceNumber}</span>
                <span className="font-bold uppercase">Date:</span>
                <span className="font-semibold text-right">{new Date(getTimestamp(data)).toLocaleDateString('en-US')}</span>
                <span className="font-bold uppercase">Time:</span>
                <span className="font-semibold text-right">{new Date(getTimestamp(data)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                {data.user?.name && (
                    <>
                        <span className="font-bold uppercase">Cashier:</span>
                        <span className="font-semibold text-right">{data.user.name}</span>
                    </>
                )}
            </div>

            {/* Items */}
            <div className="mb-4 text-black">
                <table className="w-full text-left text-[11px] border-collapse bg-transparent">
                    <thead>
                        <tr className="border-y-2 border-black">
                            <th className="py-1.5 px-1 font-bold bg-transparent text-black">Item</th>
                            <th className="py-1.5 px-1 font-bold text-center bg-transparent text-black">Qty</th>
                            <th className="py-1.5 px-1 font-bold text-right bg-transparent text-black">Price</th>
                            <th className="py-1.5 px-1 font-bold text-right bg-transparent text-black">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-black">
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-black border-dashed">
                                <td className="py-2 px-1 font-bold max-w-[40mm] break-words">{item.name}</td>
                                <td className="py-2 px-1 text-center font-bold">{item.quantity}</td>
                                <td className="py-2 px-1 text-right font-bold">{item.selling_price.toFixed(2)}</td>
                                <td className="py-2 px-1 text-right font-black">{item.subtotal.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="border-t-2 border-dashed border-black mb-3 pt-2 mt-1"></div>

            {/* Totals */}
            <div className="space-y-[3px] text-[11px] mb-4 text-black font-bold">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(_subtotal)}</span></div>
                {_discountAmt > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(_discountAmt)}</span></div>}
                {_taxAmt > 0 && <div className="flex justify-between"><span>VAT (15%)</span><span>{formatCurrency(_taxAmt)}</span></div>}
                <div className="flex justify-between items-end pt-1.5 mt-1 border-t-2 border-black">
                    <span className="font-black text-[13px] uppercase">Total</span>
                    <span className="font-black text-[14px]">{formatCurrency(_total)}</span>
                </div>
            </div>

            {/* Payment Details */}
            <div className="border-y-2 border-dashed border-black py-2 text-[11px] font-bold mb-4">
                <div className="flex justify-between mb-1"><span className="uppercase">Method:</span><span className="capitalize">{paymentMethod}</span></div>
                <div className="flex justify-between"><span className="uppercase">Paid:</span><span>{formatCurrency(_paidAmt)}</span></div>
                {_changeAmt > 0 && <div className="flex justify-between mt-1"><span className="uppercase">Change:</span><span>{formatCurrency(_changeAmt)}</span></div>}
                {_remaining > 0 && <div className="flex justify-between mt-1"><span className="uppercase">Due/Debt:</span><span>{formatCurrency(_remaining)}</span></div>}
            </div>

            <div className="text-center mt-5 pt-3 pb-5 text-[10px] font-black text-black">
                <p className="mb-0.5">Thank you for your business!</p>
                <p className="tracking-wide">Powered by PharmaCare</p>
            </div>

            <style>{`
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { margin: 0; padding: 0; background: white; color: black !important; }
                    .invoice-print-container { width: 80mm !important; max-width: 100% !important; padding: 3mm !important; margin: 0 auto !important; box-shadow: none !important; }
                    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; color: black !important; background: transparent !important; }
                }
            `}</style>
        </div>
    );
});

export default InvoiceReceipt;
