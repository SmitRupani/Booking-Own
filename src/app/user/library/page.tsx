'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  Barcode,
  User,
} from 'lucide-react';

interface BookItem {
  id: number;
  resourceId: number;
  name: string;
  author?: string;
  isbn?: string;
  description?: string;
  qtyTotal: number;
  qtyAvailable: number;
}

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/admin/equipment');
      if (res.ok) {
        const data = await res.json();
        const allItems: BookItem[] = data.items || [];
        const libraryBooks = allItems.filter(
          (item) => !!item.isbn || item.name.toLowerCase().includes('book')
        );
        setBooks(libraryBooks);
      }
    } catch {
      setError('Failed to load library catalog');
    } finally {
      setFetching(false);
    }
  };

  const filteredBooks = books.filter((book) => {
    const q = search.toLowerCase();
    return (
      book.name.toLowerCase().includes(q) ||
      (book.author && book.author.toLowerCase().includes(q)) ||
      (book.isbn && book.isbn.includes(q))
    );
  });

  const handleBorrow = async (book: BookItem) => {
    setLoading(true);
    setError('');
    setSelectedBook(book);

    try {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 14); // 14-day loan

      const payload = {
        resourceId: book.resourceId || 1,
        kind: 'LIBRARY',
        start: now.toISOString(),
        end: end.toISOString(),
        items: [{ itemId: String(book.id), name: book.name, qty: 1 }],
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to borrow book');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/user/bookings');
      }, 1500);
    } catch {
      setError('An error occurred during book loan checkout.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 inline-block mx-auto">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold">Book Issued!</h2>
        <p className="text-sm text-muted-foreground">
          {selectedBook?.name} has been added to your active loans for 14 days.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Library Collection</Badge>
          <Badge variant="success">14-Day Loan Period</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">SST Digital Library</h1>
        <p className="text-sm text-muted-foreground">
          Search textbook titles, reference volumes, and fiction collections by title, author, or ISBN barcode.
        </p>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, author, or ISBN..."
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fetching ? (
          <div className="col-span-full py-12 text-center text-muted-foreground animate-pulse">
            Loading library books...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-xl bg-card/40">
            No books found matching your search.
          </div>
        ) : (
          filteredBooks.map((book) => {
            const isAvailable = book.qtyAvailable > 0;
            return (
              <Card key={book.id} className="border hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <Badge variant={isAvailable ? 'success' : 'destructive'}>
                      {isAvailable ? `${book.qtyAvailable} In Stock` : 'Checked Out'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{book.name}</CardTitle>
                  {book.author && (
                    <CardDescription className="text-xs flex items-center gap-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      {book.author}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {book.isbn && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Barcode className="w-3.5 h-3.5 text-primary" />
                      <span>ISBN: {book.isbn}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Loan: 14 Days</span>
                    <Button
                      size="sm"
                      disabled={!isAvailable || loading}
                      onClick={() => handleBorrow(book)}
                      className="gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Borrow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
