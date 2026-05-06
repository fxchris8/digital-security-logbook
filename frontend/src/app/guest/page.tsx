"use client";

import * as React from "react";
import Image from "next/image";
import { CalendarDays, CheckCircle2, Download, Printer, QrCode, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useGenerateLogbookQR,
  useUploadLogbookPhoto,
  type LogbookFormData,
  type LogbookQRResponse,
} from "@/app/dashboard/_hooks/useLogbooks";

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const emptyValues: LogbookFormData = {
  tanggal: getTodayDate(),
  nama: "",
  alamat: "",
  nomorPolisiKendaraan: "",
  fotoTandaPengenal: "",
  perusahaan: "",
  janjiBertemuDengan: "",
  keperluan: "",
};

const readFileAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Gagal membaca file foto."));
    reader.readAsDataURL(file);
  });

export default function GuestPage() {
  const generateQRMutation = useGenerateLogbookQR();
  const uploadPhotoMutation = useUploadLogbookPhoto();
  const [formValues, setFormValues] = React.useState<LogbookFormData>(emptyValues);
  const [result, setResult] = React.useState<LogbookQRResponse | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string>("");

  const isPhotoUploading = uploadPhotoMutation.isPending;
  const isLoading = generateQRMutation.isPending || isPhotoUploading;

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
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5 MB.");
      return;
    }

    try {
      updateField("fotoTandaPengenal", "");
      setPhotoPreview(await readFileAsDataURL(file));
      const uploadedPhoto = await uploadPhotoMutation.mutateAsync(file);
      updateField("fotoTandaPengenal", uploadedPhoto.path);
      toast.success("Foto tanda pengenal berhasil diupload.");
    } catch (error) {
      updateField("fotoTandaPengenal", "");
      setPhotoPreview("");
      input.value = "";
      const message =
        error instanceof Error ? error.message : "Gagal mengupload foto tanda pengenal.";
      toast.error(message);
    }
  };

  const validateForm = () => {
    const requiredFields: Array<keyof LogbookFormData> = [
      "tanggal",
      "nama",
      "alamat",
      "perusahaan",
      "janjiBertemuDengan",
      "keperluan",
    ];

    for (const field of requiredFields) {
      if (!String(formValues[field] || "").trim()) {
        toast.error(`${field} wajib diisi`);
        return false;
      }
    }

    if (!formValues.fotoTandaPengenal) {
      toast.error(
        isPhotoUploading
          ? "Tunggu hingga upload foto selesai"
          : "Foto tanda pengenal wajib diupload"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const response = await generateQRMutation.mutateAsync(formValues);
      setResult(response);
      toast.success("Data tamu berhasil dikirim dan QR checkout sudah dibuat.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(message);
    }
  };

  const handleReset = () => {
    setFormValues({
      ...emptyValues,
      tanggal: getTodayDate(),
    });
    setResult(null);
    setPhotoPreview("");
  };

  const handleDownloadQR = async () => {
    if (!result?.qr.qrImageUrl) return;

    try {
      const response = await fetch(result.qr.qrImageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `guest-qr-${result.qr.logbookId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Gagal mengunduh QR.");
    }
  };

  const handlePrintQR = () => {
    if (!result) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      iframe.remove();
      toast.error("Gagal menyiapkan print QR.");
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>QR Checkout Tamu</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #000; }
            .sheet { width: 72mm; margin: 0 auto; text-align: center; }
            .title { font-size: 16px; font-weight: 700; margin-bottom: 2mm; }
            .qr-wrap { border: 1px dashed #000; padding: 2mm; width: fit-content; margin: 0 auto; }
            img { display: block; width: 48mm; height: 48mm; object-fit: contain; }
            .meta { margin-top: 3mm; text-align: left; font-size: 11px; line-height: 1.45; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2.5mm 0; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="title">QR Checkout Tamu</div>
            <div class="qr-wrap">
              <img src="${result.qr.qrImageUrl}" alt="QR checkout ${result.logbook.nama}" />
            </div>
            <div class="meta">
              <div><strong>Nama:</strong> ${result.logbook.nama}</div>
              <div><strong>Tanggal:</strong> ${result.logbook.tanggal}</div>
              <div><strong>Perusahaan:</strong> ${result.logbook.perusahaan || "-"}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 1000);
    };
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_45%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <Image src="/images/spil_logo.svg" alt="SPIL" width={40} height={40} priority />
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Guest Registration
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Form Tamu SPIL</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Isi data kunjungan</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Tamu mengisi data terlebih dahulu. Setelah dikirim, QR checkout akan dibuat
                otomatis.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Tanggal</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={formValues.tanggal || ""}
                      onChange={(event) => updateField("tanggal", event.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Nama</label>
                  <Input
                    value={formValues.nama}
                    onChange={(event) => updateField("nama", event.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Alamat</label>
                  <Textarea
                    rows={3}
                    value={formValues.alamat}
                    onChange={(event) => updateField("alamat", event.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    Nomor Polisi Kendaraan
                  </label>
                  <Input
                    value={formValues.nomorPolisiKendaraan}
                    onChange={(event) => updateField("nomorPolisiKendaraan", event.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Perusahaan</label>
                  <Input
                    value={formValues.perusahaan}
                    onChange={(event) => updateField("perusahaan", event.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Janji Bertemu Dengan</label>
                  <Input
                    value={formValues.janjiBertemuDengan}
                    onChange={(event) => updateField("janjiBertemuDengan", event.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Keperluan</label>
                  <Textarea
                    rows={3}
                    value={formValues.keperluan}
                    onChange={(event) => updateField("keperluan", event.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-3 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Upload Foto Selfie</label>
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 has-disabled:cursor-not-allowed has-disabled:opacity-60">
                    <Upload className="h-4 w-4" />
                    <span>
                      {isPhotoUploading ? "Mengupload foto..." : "Pilih file gambar identitas"}
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
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                      <Image
                        src={photoPreview}
                        alt="Preview tanda pengenal"
                        width={900}
                        height={208}
                        unoptimized
                        className="h-52 w-full rounded-xl object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={isLoading}>
                  {isPhotoUploading
                    ? "Mengupload Foto..."
                    : generateQRMutation.isPending
                      ? "Menyimpan..."
                      : "Kirim Data Tamu"}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
                  Reset
                </Button>
              </div>
            </form>
          </section>

          <aside className="rounded-[28px] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">QR Checkout</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Setelah form dikirim, QR checkout akan muncul di sini.
                </p>
              </div>
            </div>

            {result ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl bg-emerald-400/10 p-4 ring-1 ring-emerald-300/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                    <div>
                      <div className="font-medium text-emerald-100">
                        Data tamu berhasil disimpan
                      </div>
                      <div className="mt-1 text-sm text-emerald-50/80">
                        Simpan atau cetak QR ini untuk proses checkout saat tamu keluar.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-5 text-slate-900">
                  <Image
                    src={result.qr.qrImageUrl}
                    alt={`QR checkout ${result.logbook.nama}`}
                    width={288}
                    height={288}
                    unoptimized
                    className="mx-auto h-72 w-72 rounded-2xl border border-slate-200 bg-white p-4"
                  />

                  <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <div>
                      <strong>Tanggal:</strong> {result.logbook.tanggal}
                    </div>
                    <div>
                      <strong>Nama:</strong> {result.logbook.nama}
                    </div>
                    <div>
                      <strong>Perusahaan:</strong> {result.logbook.perusahaan}
                    </div>
                    <div>
                      <strong>Janji Bertemu Dengan:</strong> {result.logbook.janjiBertemuDengan}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <Input value={result.qr.checkoutUrl} readOnly className="bg-white" />
                    <div className="flex flex-wrap gap-3">
                      <Button type="button" onClick={handlePrintQR}>
                        <Printer className="h-4 w-4" />
                        Print QR
                      </Button>
                      <Button type="button" variant="outline" onClick={handleDownloadQR}>
                        <Download className="h-4 w-4" />
                        Simpan QR
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-[24px] border border-dashed border-white/20 bg-white/5 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <QrCode className="h-8 w-8 text-slate-200" />
                </div>
                <div className="mt-4 text-lg font-medium">Belum ada QR</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  QR akan dibuat otomatis setelah tamu mengisi form dan menekan tombol kirim.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
