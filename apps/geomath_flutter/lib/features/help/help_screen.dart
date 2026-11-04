import 'package:flutter/material.dart';

import '../../app/app_dependencies.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/widgets/widgets.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final s = AppStrings.of(context);
    final router = AppScope.of(context).router;
    return GeoMathScaffold(
      title: s.text('foundation.help'),
      subtitle: s.text('foundation.helpIntro'),
      onBack: router.back,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GeoMathCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Center(child: GeoCubeIllustration(size: 160)),
                const SizedBox(height: 12),
                SectionHeader(title: s.text('foundation.guide')),
                const SizedBox(height: 8),
                Text(s.text('foundation.guideIntro')),
                const SizedBox(height: 16),
                ActionButton(
                  key: const ValueKey('help-guide'),
                  label: s.text('foundation.demo'),
                  icon: Icons.play_circle_rounded,
                  onPressed: () => router.open('guide'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          for (final key in [
            'faqOffline',
            'faqFaces',
            'faqRecords',
            'faqSettings',
          ]) ...[
            GeoMathCard(
              padding: EdgeInsets.zero,
              child: ExpansionTile(
                title: Text(s.text('foundation.$key')),
                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                children: [Text(s.text('foundation.${key}Body'))],
              ),
            ),
            const SizedBox(height: 10),
          ],
          const SizedBox(height: 8),
          StatusNotice(
            title: s.text('foundation.localReport'),
            message: s.text('foundation.localReportBody'),
          ),
          const SizedBox(height: 16),
          ActionButton(
            key: const ValueKey('help-report'),
            label: s.text('foundation.report'),
            icon: Icons.edit_note_rounded,
            onPressed: () => router.open('report'),
          ),
          const SizedBox(height: 12),
          ActionButton(
            label: s.text('foundation.settings'),
            kind: ActionButtonKind.secondary,
            icon: Icons.settings_outlined,
            onPressed: () => router.open('preferences'),
          ),
        ],
      ),
    );
  }
}
