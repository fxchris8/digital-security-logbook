"use client";

import * as React from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  LogbookEntry,
  LogbookFormData,
  LogbookQRResponse,
  resolveLogbookPhotoSrc,
  useGenerateLogbookQR,
  useUploadLogbookPhoto,
  useUpdateLogbook,
} from "./_hooks/useLogbooks";
import { toast } from "sonner";

interface LogbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit?: boolean;
  defaultValues?: LogbookEntry | null;
  onGenerated?: (data: LogbookQRResponse) => void;
}

const emptyValues: LogbookFormData = {
  nama: "",
  nomorTelepon: "",
  alamat: "",
  nomorPolisiKendaraan: "",
  fotoTandaPengenal: "",
  perusahaan: "",
  janjiBertemuDengan: "",
  keperluan: "",
};

const requiredLabels: Partial<Record<keyof LogbookFormData, string>> = {
  nama: "Nama",
  nomorTelepon: "Nomor telepon",
  alamat: "Alamat",
  fotoTandaPengenal: "Foto tanda pengenal",
  perusahaan: "Perusahaan",
  janjiBertemuDengan: "Janji bertemu dengan",
  keperluan: "Keperluan",
};

const readFileAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Gagal membaca file foto."));
    reader.readAsDataURL(file);
  });

export function LogbookDialog({
  open,
  onOpenChange,
  isEdit = false,
  defaultValues,
  onGenerated,
}: LogbookDialogProps) {
  const generateQRMutation = useGenerateLogbookQR();
  const uploadPhotoMutation = useUploadLogbookPhoto();
  const updateMutation = useUpdateLogbook();
  const isPhotoUploading = uploadPhotoMutation.isPending;
  const isLoading =
    generateQRMutation.isPending || uploadPhotoMutation.isPending || updateMutation.isPending;
  const [formValues, setFormValues] = React.useState<LogbookFormData>(emptyValues);
  const [photoPreview, setPhotoPreview] = React.useState("");
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    if (isEdit && defaultValues) {
      setFormValues({
        nama: defaultValues.nama || "",
        nomorTelepon: defaultValues.nomorTelepon || "",
        alamat: defaultValues.alamat || "",
        nomorPolisiKendaraan: defaultValues.nomorPolisiKendaraan || "",
        fotoTandaPengenal: defaultValues.fotoTandaPengenal || "",
        perusahaan: defaultValues.perusahaan || "",
        janjiBertemuDengan: defaultValues.janjiBertemuDengan || "",
        keperluan: defaultValues.keperluan || "",
      });
      setPhotoPreview(resolveLogbookPhotoSrc(defaultValues.fotoTandaPengenal));
      return;
    }

    setFormValues(emptyValues);
    setPhotoPreview("");
  }, [defaultValues, isEdit, open]);

  const updateField = (name: keyof LogbookFormData, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCapturedPhoto = async (file: File) => {
    try {
      updateField("fotoTandaPengenal", "");
      setPhotoPreview(await readFileAsDataURL(file));
      const uploadedPhoto = await uploadPhotoMutation.mutateAsync(file);
      updateField("fotoTandaPengenal", uploadedPhoto.path);
      toast.success("Foto kamera berhasil diupload.");
    } catch (error) {
      updateField("fotoTandaPengenal", "");
      setPhotoPreview("");
      const message = error instanceof Error ? error.message : "Gagal mengupload foto kamera.";
      toast.error(message);
    }
  };

  const validateForm = () => {
    const requiredFields: Array<keyof LogbookFormData> = [
      "nama",
      "nomorTelepon",
      "alamat",
      "fotoTandaPengenal",
      "perusahaan",
      "janjiBertemuDengan",
      "keperluan",
    ];

    for (const field of requiredFields) {
      if (!String(formValues[field] ?? "").trim()) {
        const message =
          field === "fotoTandaPengenal" && isPhotoUploading
            ? "Tunggu hingga upload foto selesai"
            : `${requiredLabels[field] ?? field} wajib diisi`;
        toast.error(message);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isEdit && defaultValues) {
        await updateMutation.mutateAsync({ id: defaultValues.id, data: formValues });
        toast.success("Data logbook berhasil diupdate");
      } else {
        const result = await generateQRMutation.mutateAsync(formValues);
        toast.success("QR berhasil dibuat dan waktu masuk sudah dicatat");
        onGenerated?.(result);
      }

      onOpenChange(false);
      setFormValues(emptyValues);
      setPhotoPreview("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Logbook" : "Generate QR Logbook"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui data tamu. Waktu masuk dan keluar tidak bisa diubah manual."
              : "Isi data tamu lalu generate QR. Waktu masuk akan dicatat otomatis saat QR dibuat."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nama</label>
              <Input
                value={formValues.nama}
                onChange={(event) => updateField("nama", event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Nomor Telepon</label>
              <Input
                value={formValues.nomorTelepon}
                onChange={(event) => updateField("nomorTelepon", event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Perusahaan</label>
              <Input
                value={formValues.perusahaan}
                onChange={(event) => updateField("perusahaan", event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Janji Bertemu Dengan</label>
              <Input
                value={formValues.janjiBertemuDengan}
                onChange={(event) => updateField("janjiBertemuDengan", event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Foto Tanda Pengenal (Wajib dari Kamera)</label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCameraOpen(true)}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 rounded-md border border-dashed border-emerald-300 bg-emerald-50/50 py-5 text-sm font-medium text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-100/60 hover:text-emerald-900"
              >
                <Camera className="h-4 w-4 text-emerald-600" />
                <span>
                  {isPhotoUploading
                    ? "Mengupload foto..."
                    : formValues.fotoTandaPengenal
                      ? "Ambil Ulang Foto Kamera"
                      : "Buka Kamera untuk Ambil Foto Selfie"}
                </span>
              </Button>

              {photoPreview ? (
                <a
                  href={photoPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-md border border-slate-200 bg-white p-2"
                >
                  <Image
                    src={photoPreview}
                    alt="Preview selfie kamera"
                    width={640}
                    height={160}
                    unoptimized
                    className="h-40 w-full rounded object-cover"
                  />
                </a>
              ) : null}
            </div>

            <CameraCaptureModal
              open={isCameraOpen}
              onOpenChange={setIsCameraOpen}
              onCapture={handleCapturedPhoto}
              title="Ambil Foto Tanda Pengenal"
            />

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Alamat</label>
              <Textarea
                rows={3}
                value={formValues.alamat}
                onChange={(event) => updateField("alamat", event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Nomor Polisi Kendaraan</label>
              <Input
                value={formValues.nomorPolisiKendaraan}
                onChange={(event) => updateField("nomorPolisiKendaraan", event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Keperluan</label>
              <Textarea
                rows={3}
                value={formValues.keperluan}
                onChange={(event) => updateField("keperluan", event.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isPhotoUploading
                ? "Mengupload Foto..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Generate QR"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
