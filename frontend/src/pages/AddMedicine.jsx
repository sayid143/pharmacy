// src/pages/AddMedicine.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AddMedicine() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        defaultValues: {
            name: '',
            generic_name: '',
            category_id: '',
            supplier_id: '',
            batch_number: '',
            expiry_date: '',
            purchase_price: '',
            selling_price: '',
            quantity: '',
            min_stock_level: 10,
            barcode: '',
            dosage_form: '',
            strength: '',
            unit: 'pcs',
            description: '',
            requires_prescription: false,
        },
    });

    useEffect(() => {
        Promise.all([
            api.get('/categories').then(r => setCategories(r.data.data || [])),
            api.get('/suppliers').then(r => setSuppliers(r.data.data || [])),
        ]).catch(() => toast.error('Failed to load options'));

        if (isEdit) {
            api
                .get(`/medicines/${id}`)
                .then(({ data }) => {
                    const med = data.data;
                    reset(med);
                    if (med.image) setImagePreview(med.image);
                })
                .catch(() => {
                    toast.error('Medicine not found');
                    navigate('/medicines');
                });
        }
    }, [id, reset, navigate, isEdit]);

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB');
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setImagePreview(null);
        setImageFile(null);
    };

    const onSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            const fd = new FormData();
            Object.entries(formData).forEach(([key, val]) => {
                if (val !== undefined && val !== null) fd.append(key, val);
            });
            if (imageFile) fd.append('image', imageFile);

            if (isEdit) {
                await api.put(`/medicines/${id}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Medicine updated!');
            } else {
                await api.post('/medicines', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Medicine added!');
            }

            navigate('/medicines');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto"> {/* Reduced max width */}
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/medicines')}
                        className="p-2.5 rounded-full bg-white shadow hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft size={18} className="text-gray-700" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                            {isEdit ? 'Edit Medicine' : 'Add Medicine'}
                        </h1>
                        <p className="text-gray-600 mt-0.5 text-sm">
                            {isEdit ? 'Update details below' : 'Enter medicine details'}
                        </p>
                    </div>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Gradient Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-emerald-500 px-6 py-6 text-white">
                        <h2 className="text-xl md:text-2xl font-bold">
                            {isEdit ? 'Edit Medicine' : 'New Medicine'}
                        </h2>
                        <p className="text-blue-100 mt-1.5 text-sm">
                            Required fields marked with <span className="font-bold">*</span>
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6">
                        {/* Image Upload */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-full max-w-sm">
                                {imagePreview ? (
                                    <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-200">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-56 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 shadow hover:bg-red-700 transition"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
                                        <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                                        <p className="text-base font-medium text-gray-700">Upload Image</p>
                                        <p className="text-xs text-gray-500 mt-1">PNG, JPG • Max 5MB</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Fields - Horizontal grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                            {/* Name */}
                            <div className="relative">
                                <input
                                    {...register('name', { required: 'Required' })}
                                    id="name"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="name"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Name <span className="text-red-500">*</span>
                                </label>
                                {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
                            </div>

                            {/* Generic */}
                            <div className="relative">
                                <input
                                    {...register('generic_name')}
                                    id="generic_name"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="generic_name"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Generic Name
                                </label>
                            </div>

                            {/* Dosage Form / Category Type */}
                            <div className="relative">
                                <select
                                    {...register('dosage_form')}
                                    id="dosage_form"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white appearance-none"
                                >
                                    <option value="">Medicine Form / Category</option>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Capsule">Capsule</option>
                                    <option value="Syrup">Syrup</option>
                                    <option value="Injection">Injection</option>
                                    <option value="Suspension">Suspension</option>
                                    <option value="Ointment">Ointment</option>
                                    <option value="Drops">Drops</option>
                                    <option value="Inhaler">Inhaler</option>
                                    <option value="Cream">Cream</option>
                                    <option value="Gel">Gel</option>
                                    <option value="Powder">Powder</option>
                                    <option value="Solution">Solution</option>
                                    <option value="Ear Drops">Ear Drops</option>
                                    <option value="Eye Drops">Eye Drops</option>
                                    <option value="Suppository">Suppository</option>
                                    <option value="Other">Other</option>
                                </select>
                                <label
                                    htmlFor="dosage_form"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Dosage Form / Category
                                </label>
                            </div>



                            {/* Supplier */}
                            <div className="relative">
                                <select
                                    {...register('supplier_id')}
                                    id="supplier_id"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white appearance-none"
                                >
                                    <option value="">Supplier </option>
                                    {suppliers.map(sup => (
                                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                                    ))}
                                </select>
                                <label
                                    htmlFor="supplier_id"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Supplier
                                </label>
                            </div>

                            {/* Batch */}
                            <div className="relative">
                                <input
                                    {...register('batch_number')}
                                    id="batch_number"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="batch_number"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Batch Number
                                </label>
                            </div>

                            {/* Expiry */}
                            <div className="relative">
                                <input
                                    {...register('expiry_date', { required: 'Required' })}
                                    id="expiry_date"
                                    type="date"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                />
                                <label
                                    htmlFor="expiry_date"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Expiry Date <span className="text-red-500">*</span>
                                </label>
                                {errors.expiry_date && (
                                    <p className="text-red-600 text-xs mt-1">{errors.expiry_date.message}</p>
                                )}
                            </div>

                            {/* Barcode */}
                            <div className="relative">
                                <input
                                    {...register('barcode')}
                                    id="barcode"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="barcode"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Barcode
                                </label>
                            </div>

                            {/* Purchase Price */}
                            <div className="relative">
                                <input
                                    {...register('purchase_price', { required: 'Required', min: 0 })}
                                    id="purchase_price"
                                    type="number"
                                    step="0.01"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="purchase_price"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Purchase Price <span className="text-red-500">*</span>
                                </label>
                                {errors.purchase_price && (
                                    <p className="text-red-600 text-xs mt-1">{errors.purchase_price.message}</p>
                                )}
                            </div>

                            {/* Selling Price */}
                            <div className="relative">
                                <input
                                    {...register('selling_price', { required: 'Required', min: 0 })}
                                    id="selling_price"
                                    type="number"
                                    step="0.01"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="selling_price"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Selling Price <span className="text-red-500">*</span>
                                </label>
                                {errors.selling_price && (
                                    <p className="text-red-600 text-xs mt-1">{errors.selling_price.message}</p>
                                )}
                            </div>

                            {/* Quantity */}
                            <div className="relative">
                                <input
                                    {...register('quantity', { required: 'Required', min: 0 })}
                                    id="quantity"
                                    type="number"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="quantity"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Quantity <span className="text-red-500">*</span>
                                </label>
                                {errors.quantity && (
                                    <p className="text-red-600 text-xs mt-1">{errors.quantity.message}</p>
                                )}
                            </div>

                            {/* Min Stock */}
                            <div className="relative">
                                <input
                                    {...register('min_stock_level', { min: 0 })}
                                    id="min_stock_level"
                                    type="number"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="min_stock_level"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Min Stock Level
                                </label>
                            </div>

                            {/* Unit */}
                            <div className="relative">
                                <select
                                    {...register('unit')}
                                    id="unit"
                                    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white appearance-none"
                                >
                                    <option value="pcs">Pieces (pcs)</option>
                                    <option value="strip">Strips</option>
                                    <option value="box">Boxes</option>
                                    <option value="bottle">Bottles</option>
                                    <option value="tube">Tubes</option>
                                    <option value="ml">Milliliters (ml)</option>
                                </select>
                                <label
                                    htmlFor="unit"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Unit
                                </label>
                            </div>

                            {/* Prescription */}
                            <div className="col-span-full flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <input
                                    type="checkbox"
                                    id="prescription"
                                    {...register('requires_prescription')}
                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="prescription" className="text-base font-medium text-gray-700 cursor-pointer">
                                    Requires Prescription
                                </label>
                            </div>

                            {/* Description */}
                            <div className="col-span-full relative">
                                <textarea
                                    {...register('description')}
                                    id="description"
                                    rows={4}
                                    className="peer w-full px-4 pt-8 pb-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all outline-none bg-white resize-none"
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="description"
                                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-6 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
                                >
                                    Notes / Description / Warnings
                                </label>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-end">
                            <button
                                type="button"
                                onClick={() => navigate('/medicines')}
                                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex-1 flex items-center justify-center gap-4 min-w-[160px]"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-emerald-600 transition-all shadow-md disabled:opacity-60 flex-1 flex items-center justify-center gap-4 min-w-[160px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        {isEdit ? 'Update' : 'Add Medicine'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}