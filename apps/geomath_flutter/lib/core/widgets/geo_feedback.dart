import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// The app supplies the saved interaction preferences once above every route,
/// dialog and sheet. Feature widgets only request feedback for user actions.
final class GeoFeedbackPolicy extends InheritedWidget {
  const GeoFeedbackPolicy({
    super.key,
    required this.hapticsEnabled,
    required this.reducedMotion,
    required super.child,
  });

  final bool hapticsEnabled;
  final bool reducedMotion;

  static GeoFeedbackPolicy? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<GeoFeedbackPolicy>();

  @override
  bool updateShouldNotify(GeoFeedbackPolicy oldWidget) =>
      hapticsEnabled != oldWidget.hapticsEnabled ||
      reducedMotion != oldWidget.reducedMotion;
}

abstract final class GeoFeedback {
  /// A subtle selection cue, never required for the action to succeed. Native
  /// platform feedback also respects the device's own haptic settings.
  static Future<void> selection(BuildContext context) async {
    final policy = GeoFeedbackPolicy.maybeOf(context);
    if (policy?.hapticsEnabled != true ||
        policy!.reducedMotion ||
        MediaQuery.maybeDisableAnimationsOf(context) == true) {
      return;
    }
    try {
      await HapticFeedback.selectionClick();
    } on PlatformException {
      // Optional feedback must not turn a valid action into an error.
    } on MissingPluginException {
      // Preview/test platforms can render the controls without this plugin.
    }
  }
}
