"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogbookQRResponse } from "./_hooks/useLogbooks";
import { toast } from "sonner";

interface LogbookQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LogbookQRResponse | null;
}

export function LogbookQRDialog({ open, onOpenChange, data }: LogbookQRDialogProps) {
  const printFrameRef = React.useRef<HTMLIFrameElement | null>(null);

  const handleCopy = async () => {
    if (!data?.qr.checkoutUrl) return;

    try {
      await navigator.clipboard.writeText(data.qr.checkoutUrl);
      toast.success("Link checkout berhasil disalin");
    } catch {
      toast.error("Gagal menyalin link checkout");
    }
  };

  const handleDownload = async () => {
    if (!data?.qr.qrImageUrl) return;

    try {
      const response = await fetch(data.qr.qrImageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `logbook-qr-${data.qr.logbookId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(data.qr.qrImageUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handlePrint = () => {
    if (!data) return;

    const existingFrame = printFrameRef.current;
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
    printFrameRef.current = iframe;

    const printDocument = iframe.contentWindow?.document;
    if (!printDocument || !iframe.contentWindow) {
      iframe.remove();
      printFrameRef.current = null;
      toast.error("Gagal menyiapkan halaman print.");
      return;
    }

    printDocument.open();
    printDocument.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Print QR Checkout Tamu</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            body {
              font-family: Arial, sans-serif;
              color: #000000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              width: 72mm;
              margin: 0 auto;
              text-align: center;
              padding: 2mm 0 4mm;
            }
            .title {
              font-size: 16px;
              font-weight: 700;
              line-height: 1.2;
              margin: 0 0 2mm;
            }
            .subtitle {
              font-size: 10px;
              line-height: 1.35;
              margin: 0 0 3mm;
            }
            .qr-wrap {
              border: 1px dashed #000;
              padding: 2mm;
              margin: 0 auto;
              width: fit-content;
            }
            img {
              display: block;
              width: 48mm;
              height: 48mm;
              object-fit: contain;
            }
            .meta {
              margin-top: 3mm;
              text-align: left;
              font-size: 11px;
              line-height: 1.45;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 2.5mm 0;
            }
            .meta-row {
              margin: 0 0 1.5mm;
            }
            .meta-row:last-child {
              margin-bottom: 0;
            }
            .label {
              font-weight: 700;
            }
            .hint {
              margin-top: 3mm;
              font-size: 10px;
              line-height: 1.35;
            }
            .link {
              margin-top: 2mm;
              font-size: 9px;
              word-break: break-all;
              line-height: 1.35;
            }
            @media print {
              html, body {
                width: 80mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="title">QR Checkout Tamu</div>
            <div class="subtitle">Scan QR ini saat tamu keluar</div>
            <div class="qr-wrap">
              <img src="${data.qr.qrImageUrl}" alt="QR checkout ${data.logbook.nama}" />
            </div>
            <div class="meta">
              <div class="meta-row"><span class="label">Nama:</span> ${data.logbook.nama}</div>
              <div class="meta-row"><span class="label">Perusahaan:</span> ${data.logbook.perusahaan || "-"}</div>
              <div class="meta-row"><span class="label">Waktu Masuk:</span> ${data.logbook.waktuMasuk || "-"}</div>
            </div>
            <div class="hint">Jika QR sulit dipindai, gunakan link berikut:</div>
            <div class="link">${data.qr.checkoutUrl}</div>
          </div>
        </body>
      </html>
    `);

    printDocument.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      window.setTimeout(() => {
        iframe.remove();
        if (printFrameRef.current === iframe) {
          printFrameRef.current = null;
        }
      }, 1000);
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>QR Checkout Tamu</DialogTitle>
          <DialogDescription>
            QR ini dipakai untuk checkout. Saat QR di-scan, waktu keluar akan tercatat otomatis.
          </DialogDescription>
        </DialogHeader>

        {data ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <img
                src={data.qr.qrImageUrl}
                alt={`QR checkout ${data.logbook.nama}`}
                className="mx-auto h-72 w-72 rounded-lg border bg-white p-3"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Link Checkout</div>
              <Input value={data.qr.checkoutUrl} readOnly />
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <div>Nama: {data.logbook.nama}</div>
              <div>Waktu Masuk: {data.logbook.waktuMasuk || "-"}</div>
              <div>Perusahaan: {data.logbook.perusahaan}</div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handlePrint}>
            Print
          </Button>
          <Button type="button" variant="outline" onClick={handleCopy}>
            Copy Link
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload}>
            Simpan QR
          </Button>
          {data ? (
            <Button asChild>
              <a href={data.qr.qrImageUrl} target="_blank" rel="noreferrer">
                Buka QR
              </a>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
