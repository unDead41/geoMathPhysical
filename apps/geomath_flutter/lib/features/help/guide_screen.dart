import 'package:flutter/material.dart';

import '../../app/app_dependencies.dart';
import '../../core/design/design.dart';
import '../../core/geometry/geometry_card_provider.dart';
import '../../core/geometry/geometry_card_view.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/widgets/widgets.dart';

class GuideScreen extends StatefulWidget {
  const GuideScreen({super.key});
  @override
  State<GuideScreen> createState() => _GuideScreenState();
}

class _GuideScreenState extends State<GuideScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController demo = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 4800),
  );
  bool played = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context) && demo.isAnimating) {
      demo.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final scope = AppScope.of(context);
    final s = AppStrings.of(context);
    final colors = GeoMathColors.of(context);
    final reduced = MediaQuery.disableAnimationsOf(context);
    return GeoMathScaffold(
      title: s.text('foundation.guide'),
      subtitle: s.text('foundation.guideIntro'),
      onBack: scope.router.back,
      body: AnimatedBuilder(
        animation: demo,
        builder: (context, _) {
          final phase = (demo.value * 3).floor().clamp(0, 2);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GeoMathCard(
                color: colors.infoContainer,
                child: Column(
                  children: [
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 16,
                      runSpacing: 16,
                      children: [
                        Column(
                          children: [
                            GeometryCardView(
                              shape: GeometryShape.cube,
                              kind: GeometryCardKind.solid,
                              provider: scope.dependencies.geometry,
                              size: 110,
                              semanticLabel:
                                  'R1 · ${s.text('foundation.step1')}',
                            ),
                            const SizedBox(height: 8),
                            const Text('R1 · 1'),
                          ],
                        ),
                        Column(
                          children: [
                            GeometryCardView(
                              shape: GeometryShape.cube,
                              kind: GeometryCardKind.net,
                              provider: scope.dependencies.geometry,
                              size: 110,
                              semanticLabel:
                                  'R2 · ${s.text('foundation.step2')}',
                            ),
                            const SizedBox(height: 8),
                            const Text('R2 · 2'),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    LinearProgressIndicator(
                      value: demo.value,
                      semanticsLabel: s.text('foundation.demo'),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '${phase + 1} · ${s.text('foundation.step${phase + 1}')}',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              for (var i = 1; i <= 3; i++) ...[
                GeoMathCard(
                  color: played && phase == i - 1 ? colors.infoContainer : null,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(radius: 18, child: Text('$i')),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              s.text('foundation.step$i'),
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 6),
                            Text(s.text('foundation.step${i}Body')),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
              if (reduced)
                StatusNotice(message: s.text('foundation.motionOff')),
              if (played && demo.isCompleted)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(s.text('foundation.demoStopped')),
                ),
              const SizedBox(height: 8),
              ActionButton(
                key: const ValueKey('guide-demo'),
                label: s.text(played ? 'foundation.replay' : 'foundation.demo'),
                icon: Icons.play_circle_rounded,
                onPressed: demo.isAnimating
                    ? null
                    : () {
                        setState(() => played = true);
                        if (reduced) {
                          demo.value = 1;
                        } else {
                          demo.forward(from: 0);
                        }
                      },
              ),
              const SizedBox(height: 16),
              StatusNotice(message: s.text('foundation.guideNote')),
            ],
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    demo.dispose();
    super.dispose();
  }
}
