"use client";

import * as React from "react";
import Image from "next/image";
import { Upload } from "lucide-react";

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
  alamat: "",
  nomorPolisiKendaraan: "",
  fotoTandaPengenal: "",
  perusahaan: "",
  janjiBertemuDengan: "",
  keperluan: "",
};

const requiredLabels: Partial<Record<keyof LogbookFormData, string>> = {
  nama: "Nama",
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

  React.useEffect(() => {
    if (!open) return;

    if (isEdit && defaultValues) {
      setFormValues({
        nama: defaultValues.nama || "",
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File tanda pengenal harus berupa gambar.");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5 MB.");
      input.value = "";
      return;
    }

    try {
      updateField("fotoTandaPengenal", "");
      setPhotoPreview(await readFileAsDataURL(file));
      const uploadedPhoto = await uploadPhotoMutation.mutateAsync(file);
      updateField("fotoTandaPengenal", uploadedPhoto.path);
      toast.success("Foto selfie berhasil diupload.");
    } catch (error) {
      updateField("fotoTandaPengenal", "");
      setPhotoPreview("");
      input.value = "";
      const message = error instanceof Error ? error.message : "Gagal mengupload foto selfie.";
      toast.error(message);
    }
  };

  const validateForm = () => {
    const requiredFields: Array<keyof LogbookFormData> = [
      "nama",
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
              <label className="text-sm font-medium">Foto Tanda Pengenal</label>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 has-disabled:cursor-not-allowed has-disabled:opacity-60">
                <Upload className="h-4 w-4" />
                <span>
                  {isPhotoUploading
                    ? "Mengupload foto..."
                    : formValues.fotoTandaPengenal
                      ? "Ganti file gambar identitas"
                      : "Pilih file gambar identitas"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isLoading}
                />
              </label>

              {photoPreview ? (
                <a
                  href={photoPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-md border border-slate-200 bg-white p-2"
                >
                  <Image
                    src={photoPreview}
                    alt="Preview tanda pengenal"
                    width={640}
                    height={160}
                    unoptimized
                    className="h-40 w-full rounded object-cover"
                  />
                </a>
              ) : null}
            </div>

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
