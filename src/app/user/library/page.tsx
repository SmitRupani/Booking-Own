'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { CompactTimePicker } from '@/components/ui/CompactTimePicker';
import { LoadingState } from '@/components/ui/LoadingState';
import { AccessRestricted } from '@/components/ui/AccessRestricted';
import { getISTToday, getISTNow } from '@/lib/timezone-client';
import { triggerBookingSuccess } from '@/lib/confetti';
import { Search, BookOpen, Grid3X3, List, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { cn } from '@/lib/utils';

interface BookItem {
  id: number;
  name: string;
  qtyAvailable: number;
  qtyTotal: number;
  isbn?: string;
  author?: string;
}

interface LibraryResource {
  id: number;
  name: string;
  category: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [fictionBooks, setFictionBooks] = useState<BookItem[]>([]);
  const [nonFictionBooks, setNonFictionBooks] = useState<BookItem[]>([]);
  const [textbooks, setTextbooks] = useState<BookItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [date, setDate] = useState(getISTToday());
  const [startTime, setStartTime] = useState('09:00');
  const [loading, setLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isScanning, setIsScanning] = useState(false);
  const [scanningError, setScanningError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const libraryEnabled = true;

  const bookThought = useMemo(
    () => ({ text: 'A room without books is like a body without a soul.', author: 'Cicero' }),
    []
  );

  useEffect(() => {
    if (!libraryEnabled) {
      setResourcesLoading(false);
      return;
    }
    fetchResources();
  }, [libraryEnabled]);

  useEffect(() => {
    const today = getISTToday();
    if (date === today) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const now = getISTNow();
      const selectedTime = new Date(now);
      selectedTime.setHours(hours, minutes, 0, 0);

      if (selectedTime < now) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const roundedMinutes = Math.ceil(currentMinutes / 15) * 15;
        const nextHour = Math.floor(roundedMinutes / 60);
        const nextMinute = roundedMinutes % 60;
        const nextTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;

        if (nextHour >= 9 && nextHour < 20) {
          setStartTime(nextTime);
        } else if (nextHour < 9) {
          setStartTime('09:00');
        } else {
          setStartTime('09:00');
        }
      }
    }
  }, [date]);

  const fetchResources = async () => {
    setResourcesLoading(true);
    setError('');

    try {
      const res = await fetch('/api/resources?category=library');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to fetch library resources');
      }
      const data = await res.json();
      const resources: LibraryResource[] = Array.isArray(data.resources) ? data.resources : [];
      setLibraryResources(resources);

      for (const resource of resources) {
        const itemsRes = await fetch(`/api/admin/equipment?resourceId=${resource.id}`);
        if (!itemsRes.ok) {
          const itemsBody = await itemsRes.json().catch(() => ({}));
          throw new Error(itemsBody.error || `Failed to fetch books for ${resource.name}`);
        }
        const itemsData = await itemsRes.json();
        const items: BookItem[] = Array.isArray(itemsData.items) ? itemsData.items : [];

        if (resource.name === 'Non-Fiction Library') {
          setNonFictionBooks(items);
        } else if (resource.name === 'Fiction Library') {
          setFictionBooks(items);
        } else if (resource.name === 'Textbooks Library') {
          setTextbooks(items);
        }
      }
    } catch (err) {
      console.error('Failed to fetch library resources:', err);
      setError(err instanceof Error ? err.message : 'Failed to load library resources.');
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleBookSelect = (bookId: number) => {
    setSelectedBook(selectedBook === bookId ? null : bookId);
  };

  const startScanner = async () => {
    setIsScanning(true);
    setScanningError('');
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setIsScanning(false);
      isScanningRef.current = false;
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  useEffect(() => {
    if (!isScanning) return;

    const initCamera = async () => {
      try {
        const html5QrCode = new Html5Qrcode('library-scanner');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            if (isScanningRef.current) return;
            isScanningRef.current = true;

            await handleIsbnScanned(decodedText);

            setTimeout(() => {
              isScanningRef.current = false;
            }, 2000);
          },
          (errorMessage) => {
            console.debug(errorMessage);
          }
        );
      } catch (err) {
        console.error('Camera error:', err);
        setScanningError('Failed to start camera. Please check permissions.');
        setIsScanning(false);
      }
    };

    initCamera();

    return () => {
      stopScanner();
    };
  }, [isScanning]);

  const handleIsbnScanned = async (isbn: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/isbn/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Book not found');

      setSelectedBook(Number(data.book.id));
      stopScanner();
    } catch (err: any) {
      setError(`ISBN Scan Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (resourceId: number) => {
    if (!selectedBook) {
      setError('Please select a book');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const start = new Date(`${date}T${startTime}:00+05:30`);
      const startHour = parseInt(startTime.split(':')[0]);
      const today = getISTToday();

      if (date === today && start < getISTNow()) {
        setError('Pickup time must be in the future for today');
        setLoading(false);
        return;
      }

      if (startHour < 8 || startHour >= 20) {
        setError('Book borrowing is only available between 8:00 AM and 8:00 PM');
        setLoading(false);
        return;
      }

      const end = new Date(start);
      end.setDate(end.getDate() + 14); // 14 days later

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId,
          kind: 'LIBRARY',
          start: start.toISOString(),
          end: end.toISOString(),
          items: [{ itemId: selectedBook, qty: 1 }],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to borrow book');
      }

      setSuccess(true);
      triggerBookingSuccess();
      router.push('/user/bookings');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderBookList = (books: any[], resourceId: number, category: 'fiction' | 'non-fiction' | 'textbooks') => {
    const categoryConfig = {
      fiction: { icon: '📚', color: 'from-purple-500/10 to-purple-600/5 border-purple-500/25', accent: 'purple' },
      'non-fiction': { icon: '📖', color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/25', accent: 'emerald' },
      textbooks: { icon: '📘', color: 'from-blue-500/10 to-blue-600/5 border-blue-500/25', accent: 'blue' },
    };

    const config = categoryConfig[category];

    const filteredBooks = books.filter(book =>
      book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const availableCount = filteredBooks.filter(b => b.qtyAvailable > 0).length;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Pickup Date</label>
            <DatePicker
              value={new Date(date)}
              onChange={(newDate) => {
                if (newDate instanceof Date) {
                  const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
                  setDate(dateStr);
                }
              }}
              minDate={new Date(getISTToday())}
              placeholder="Select pickup date"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Pickup Time</label>
            <CompactTimePicker
              date={date}
              value={startTime}
              onChange={setStartTime}
              minTime="08:00"
              maxTime="20:00"
              stepMinutes={30}
              label="Pickup Time"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isScanning ? 'default' : 'ghost'}
              size="sm"
              onClick={isScanning ? stopScanner : startScanner}
              className="h-10 border border-white/10 text-white hover:bg-white/5"
            >
              <Camera className="mr-2 h-4 w-4" />
              {isScanning ? 'Stop Scanner' : 'Scan ISBN'}
            </Button>
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-white/10 h-10">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isScanning && (
          <div className="space-y-2">
            <div
              id="library-scanner"
              className="rounded-lg overflow-hidden border-2 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] max-w-sm mx-auto"
            ></div>
            {scanningError && (
              <p className="text-center text-xs text-red-500">{scanningError}</p>
            )}
            <p className="text-center text-xs text-slate-400">Point camera at the book's ISBN barcode</p>
          </div>
        )}

        <div className={cn('rounded-xl border bg-gradient-to-br p-4 space-y-3', config.color)}>
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <span className="text-2xl">{config.icon}</span>
            <h3 className="font-semibold text-white">Select a Book</h3>
            <div className="ml-auto flex items-center gap-2">
              <Badge className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30">
                {availableCount} available
              </Badge>
              <Badge className="text-xs bg-slate-800 text-slate-300">
                {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
              </Badge>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">📚</span>
              <p className="text-slate-400">
                {searchQuery ? `No books found matching "${searchQuery}"` : 'No books available in this category'}
              </p>
              {searchQuery && (
                <Button variant="ghost" size="sm" className="mt-2 text-white" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className={cn(
                    'relative p-3 rounded-xl cursor-pointer transition-all duration-200 border border-white/5',
                    selectedBook === book.id
                      ? 'ring-2 ring-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-white/5 hover:-translate-y-1',
                    book.qtyAvailable === 0 ? 'opacity-50' : ''
                  )}
                  onClick={() => book.qtyAvailable > 0 && handleBookSelect(book.id)}
                >
                  {selectedBook === book.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}

                  <div className="w-full aspect-[3/4] rounded-lg bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center mb-2">
                    <BookOpen className="h-8 w-8 text-slate-600" />
                  </div>

                  <p className="font-medium text-white text-sm truncate">{book.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{book.author || 'Unknown Author'}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                    <span className="text-xs text-slate-400">{book.qtyAvailable}/{book.qtyTotal}</span>
                    {book.qtyAvailable === 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">Out of Stock</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className={cn(
                    'flex items-center gap-3 bg-slate-900/40 rounded-lg p-3 cursor-pointer transition-all duration-200 border border-white/5',
                    selectedBook === book.id
                      ? 'ring-2 ring-blue-500 bg-blue-500/10'
                      : 'hover:bg-slate-900'
                  )}
                  onClick={() => book.qtyAvailable > 0 && handleBookSelect(book.id)}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    selectedBook === book.id ? 'bg-blue-500/20' : 'bg-slate-950'
                  )}>
                    <BookOpen className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{book.name}</p>
                    <p className="text-xs text-slate-400 truncate">{book.author || 'Unknown Author'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {book.qtyAvailable > 0 ? (
                      <Badge className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/20">Available</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Out</Badge>
                    )}
                    {selectedBook === book.id && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400 flex items-center gap-2">
            <span>✅</span> Book borrowed successfully! Redirecting...
          </div>
        )}

        <Button
          onClick={() => handleBorrow(resourceId)}
          disabled={loading || !selectedBook}
          className="w-full text-white bg-blue-600 hover:bg-blue-700"
        >
          {loading ? '📚 Processing...' : '📖 Borrow Book (14 Days)'}
        </Button>

        <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
            <span>ℹ️</span> Borrowing Rules
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              1 book at a time per student
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              Pick up within 24 hours (scan QR code)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              Return within 14 days
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Late return: 2 penalty points
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const totalBooks = fictionBooks.length + nonFictionBooks.length + textbooks.length;
  const totalAvailable = [...fictionBooks, ...nonFictionBooks, ...textbooks].filter(b => b.qtyAvailable > 0).length;
  const fictionResource = libraryResources.find(r => r.name === 'Fiction Library');
  const nonFictionResource = libraryResources.find(r => r.name === 'Non-Fiction Library');
  const textbooksResource = libraryResources.find(r => r.name === 'Textbooks Library');

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent p-6 border border-amber-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="absolute top-4 right-8 text-4xl opacity-20">📚</div>
        <div className="absolute bottom-4 right-24 text-3xl opacity-20">📖</div>
        <div className="absolute top-12 right-32 text-2xl opacity-20">📘</div>

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 blur-xl opacity-40 animate-pulse" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 backdrop-blur-sm flex items-center justify-center">
                <span className="text-4xl drop-shadow-lg">📚</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Library</h1>
              <p className="text-slate-400">
                Borrow books for 14 days • {totalBooks} books in collection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-slate-400">Available</p>
              <p className="text-lg font-bold text-green-500">{totalAvailable}</p>
            </div>
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-slate-400">Categories</p>
              <p className="text-lg font-bold text-amber-500">3</p>
            </div>
          </div>
        </div>
      </div>

      {resourcesLoading ? (
        <LoadingState
          title="Loading library collection"
          subtitle="Fetching categories and available books..."
          thought={bookThought.text}
          thoughtAuthor={bookThought.author}
          variant="galaxy"
        />
      ) : error ? (
        <AccessRestricted message={error} className="animate-fade-in" />
      ) : (
        <Tabs defaultValue="fiction" className="animate-fade-in">
          <TabsList className="mb-6 bg-slate-900 border border-white/5">
            <TabsTrigger value="fiction">
              <span className="mr-2">📚</span> Fiction ({fictionBooks.length})
            </TabsTrigger>
            <TabsTrigger value="non-fiction">
              <span className="mr-2">📖</span> Non-Fiction ({nonFictionBooks.length})
            </TabsTrigger>
            <TabsTrigger value="textbooks">
              <span className="mr-2">📘</span> Textbooks ({textbooks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fiction" className="animate-fade-in-up">
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  📚 Fiction Books
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Classic and contemporary fiction titles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fictionResource ? (
                  renderBookList(
                    fictionBooks,
                    fictionResource.id,
                    'fiction'
                  )
                ) : (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">📚</span>
                    <p className="text-slate-400">Fiction library not configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="non-fiction" className="animate-fade-in-up">
            <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  📖 Non-Fiction Books
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Self-help, business, and educational books
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nonFictionResource ? (
                  renderBookList(
                    nonFictionBooks,
                    nonFictionResource.id,
                    'non-fiction'
                  )
                ) : (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">📖</span>
                    <p className="text-slate-400">Non-fiction library not configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="textbooks" className="animate-fade-in-up">
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  📘 Textbooks
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Computer Science and Programming textbooks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {textbooksResource ? (
                  renderBookList(
                    textbooks,
                    textbooksResource.id,
                    'textbooks'
                  )
                ) : (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">📘</span>
                    <p className="text-slate-400">Textbooks library not configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
