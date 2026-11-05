import 'app/app.dart';
import 'app/production_features.dart';

Future<void> main() => runGeoMath(
  features: productionFeatures(),
  initialize: initializeProduction,
);
