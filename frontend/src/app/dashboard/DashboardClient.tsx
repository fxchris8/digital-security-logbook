"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { ChevronLeftIcon, ChevronRightIcon, Pencil, Plus, QrCode } from "lucide-react";
import { IPaginationRequest, PageType } from "@/types/global-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "use-debounce";
import { LogbookDialog } from "./LogbookDialog";
import {
  LogbookEntry,
  LogbookQRResponse,
  resolveLogbookPhotoSrc,
  useDeleteLogbook,
  useGetLogbookQR,
  useGetLogbooks,
} from "./_hooks/useLogbooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogbookQRDialog } from "./LogbookQRDialog";

const PAGE_SIZES = [10, 20, 50, 100];

const getLogbookValue = (report: LogbookEntry, keys: Array<keyof LogbookEntry>) => {
  for (const key of keys) {
    const value = report[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return "-";
};

export default function DashboardClient() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 500);

  // Pagination request state
  const [paginationRequest, setPaginationRequest] = useState<IPaginationRequest>({
    anchorId: 0,
    page: "next",
    pageSize: 10,
    filter: "",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLogbook, setEditingLogbook] = useState<LogbookEntry | null>(null);
  const [deletingLogbook, setDeletingLogbook] = useState<LogbookEntry | null>(null);
  const [qrDialogData, setQRDialogData] = useState<LogbookQRResponse | null>(null);

  // Reset pagination when search query changes
  useEffect(() => {
    setPaginationRequest((prev) => ({
      ...prev,
      anchorId: 0,
      page: "next",
      query: debouncedQuery || undefined,
    }));
  }, [debouncedQuery]);

  const {
    data: paginationData,
    isLoading: logbooksLoading,
    error: logbooksError,
  } = useGetLogbooks(paginationRequest);
  const deleteLogbookMutation = useDeleteLogbook();
  const getLogbookQRMutation = useGetLogbookQR();

  useEffect(() => {
    if (logbooksError) {
      toast.error(logbooksError.message || "Failed to fetch logbook data");
    }
  }, [logbooksError]);

  // Pagination navigation
  const navigatePage = (page: PageType) => {
    if (!paginationData) return;
    setPaginationRequest({
      ...paginationRequest,
      page: page,
      anchorId: page == "next" ? paginationData?.last_id : paginationData?.first_id,
    });
  };

  const handleDelete = async () => {
    if (!deletingLogbook) return;

    try {
      await deleteLogbookMutation.mutateAsync(deletingLogbook.id);
      toast.success("Data logbook berhasil dihapus");
      setDeletingLogbook(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus data logbook";
      toast.error(message);
    }
  };

  const handleOpenQR = async (logbook: LogbookEntry) => {
    try {
      const result = await getLogbookQRMutation.mutateAsync(logbook.id);
      setQRDialogData(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat QR";
      toast.error(message);
    }
  };

  return (
    <>
      <LogbookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onGenerated={(data) => setQRDialogData(data)}
      />
      <LogbookDialog
        open={!!editingLogbook}
        onOpenChange={(open) => {
          if (!open) setEditingLogbook(null);
        }}
        isEdit
        defaultValues={editingLogbook}
      />
      <LogbookQRDialog
        open={!!qrDialogData}
        onOpenChange={(open) => {
          if (!open) setQRDialogData(null);
        }}
        data={qrDialogData}
      />
      <AlertDialog
        open={!!deletingLogbook}
        onOpenChange={(open) => {
          if (!open) setDeletingLogbook(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data logbook?</AlertDialogTitle>
            <AlertDialogDescription>
              Data untuk {deletingLogbook?.nama} akan dihapus permanen dari tabel logbook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLogbookMutation.isPending}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <Select
              value={paginationRequest.pageSize.toString()}
              onValueChange={(val) => {
                const size = parseInt(val);
                setPaginationRequest({
                  ...paginationRequest,
                  pageSize: size,
                  anchorId: 0,
                  page: "next",
                });
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Page Size" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground whitespace-nowrap">Halaman</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Cari nama, nomor telepon, alamat, nomor polisi, perusahaan, pihak yang ditemui, atau keperluan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[360px] bg-white shadow-sm"
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Generate QR
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="grid grid-cols-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Tanggal</TableHead>
              <TableHead className="text-center">Waktu Masuk</TableHead>
              <TableHead className="text-center">Waktu Keluar</TableHead>
              <TableHead className="text-center">Nama</TableHead>
              <TableHead className="text-center">Nomor Telepon</TableHead>
              <TableHead className="text-center">Alamat</TableHead>
              <TableHead className="text-center">Nomor Polisi Kendaraan</TableHead>
              <TableHead className="text-center">Foto Selfie</TableHead>
              <TableHead className="text-center">Perusahaan</TableHead>
              <TableHead className="text-center">Janji Bertemu Dengan</TableHead>
              <TableHead className="text-center">Keperluan</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logbooksLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : logbooksError ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center font-bold text-red-500 py-8">
                  Error: {(logbooksError as Error).message}
                </TableCell>
              </TableRow>
            ) : paginationData?.results && paginationData.results.length > 0 ? (
              paginationData.results.map((logbook) => {
                const photoSrc = resolveLogbookPhotoSrc(logbook.fotoTandaPengenal);

                return (
                  <TableRow key={logbook.id} className="hover:bg-gray-100">
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["tanggal"])}
                    </TableCell>
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["waktuMasuk"])}
                    </TableCell>
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["waktuKeluar"])}
                    </TableCell>
                    <TableCell className="text-center font-bold">{logbook.nama}</TableCell>
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["nomorTelepon"])}
                    </TableCell>
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["alamat"])}
                    </TableCell>
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["nomorPolisiKendaraan"])}
                    </TableCell>
                    <TableCell className="text-center">
                      {photoSrc ? (
                        <a href={photoSrc} target="_blank" rel="noreferrer">
                          <Image
                            src={photoSrc}
                            alt={`Foto tanda pengenal ${logbook.nama}`}
                            width={96}
                            height={64}
                            unoptimized
                            className="mx-auto h-16 w-24 rounded-md border object-cover"
                          />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["perusahaan"])}
                    </TableCell>
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["janjiBertemuDengan"])}
                    </TableCell>
                    <TableCell className="text-center">
                      {getLogbookValue(logbook, ["keperluan"])}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingLogbook(logbook)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenQR(logbook)}
                          disabled={getLogbookQRMutation.isPending || !logbook.waktuMasuk}
                        >
                          <QrCode className="h-4 w-4" />
                          QR
                        </Button>
                        {/* <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingLogbook(logbook)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={12} className="text-center font-bold text-gray-400">
                  No Data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination className="mt-6">
        <PaginationContent className="flex justify-between w-full">
          <PaginationItem>
            <Button
              className="cursor-pointer transition duration-300 active:scale-95 disabled:cursor-not-allowed"
              disabled={paginationData?.first_page}
              onClick={() => navigatePage("prev")}
            >
              <ChevronLeftIcon />
              Previous
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              className="cursor-pointer transition duration-300 active:scale-95 disabled:cursor-not-allowed"
              disabled={!paginationData?.has_more}
              onClick={() => navigatePage("next")}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </>
  );
}
