// Basic smoke test: verifies the app boots without throwing.
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:wordbook/main.dart';

void main() {
  testWidgets('App launches without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump();
    // AuthWrapper has a 3s splash delay before it checks auth state;
    // advance past it so no Timer is left pending when the test tears down.
    await tester.pump(const Duration(seconds: 4));

    expect(tester.takeException(), isNull);
  });
}
