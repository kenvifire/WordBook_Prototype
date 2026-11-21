import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/book.dart';
import '../repositories/book_repository.dart';
import '../services/book/book_service.dart';

final bookRepositoryProvider = Provider<BookRepository>((ref) => BookRepository());

final bookServiceProvider = Provider<BookService>((ref) => BookService());

final booksProvider = FutureProvider.family<List<Book>, String?>((ref, userId) async {
  final repository = ref.watch(bookRepositoryProvider);
  return await repository.getAllBooks(userId: userId);
});

final bookProvider = FutureProvider.family<Book?, String>((ref, bookId) async {
  final repository = ref.watch(bookRepositoryProvider);
  return await repository.getBookById(bookId);
});
