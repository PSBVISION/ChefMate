import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Circle,
  Line,
} from "@react-pdf/renderer";

const ORANGE = "#ea580c";
const ORANGE_LIGHT = "#fff7ed";
const AMBER = "#f59e0b";
const STONE_700 = "#44403c";
const STONE_500 = "#78716c";
const STONE_300 = "#d6d3d1";
const STONE_100 = "#f5f5f4";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 50,
    paddingHorizontal: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: STONE_700,
    backgroundColor: WHITE,
  },
  /* Header band */
  headerBand: {
    backgroundColor: ORANGE,
    paddingVertical: 20,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 8,
    color: "#fed7aa",
    letterSpacing: 0.3,
  },
  /* Title area */
  titleArea: {
    paddingHorizontal: 36,
    paddingTop: 22,
    paddingBottom: 14,
  },
  recipeTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: STONE_700,
    marginBottom: 6,
  },
  description: {
    fontSize: 10,
    color: STONE_500,
    lineHeight: 1.5,
  },
  /* Meta badges row */
  metaRow: {
    flexDirection: "row",
    paddingHorizontal: 36,
    marginBottom: 16,
    gap: 10,
  },
  metaBadge: {
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaLabel: {
    fontSize: 7,
    color: STONE_500,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: ORANGE,
  },
  /* Divider */
  divider: {
    height: 1,
    backgroundColor: STONE_300,
    marginHorizontal: 36,
    marginBottom: 16,
  },
  /* Content wrapper */
  content: {
    paddingHorizontal: 36,
  },
  /* Columns */
  columns: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 18,
  },
  leftCol: {
    width: "38%",
  },
  rightCol: {
    width: "62%",
  },
  /* Section card */
  sectionCard: {
    backgroundColor: STONE_100,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: ORANGE,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  /* Ingredients */
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: STONE_300,
  },
  ingredientItem: {
    fontSize: 10,
    color: STONE_700,
    maxWidth: "60%",
  },
  ingredientAmount: {
    fontSize: 10,
    color: STONE_500,
    textAlign: "right",
  },
  /* Instructions */
  stepBlock: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumber: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    textAlign: "center",
    lineHeight: 22,
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: STONE_700,
    marginBottom: 2,
  },
  stepText: {
    fontSize: 9.5,
    color: STONE_500,
    lineHeight: 1.5,
  },
  /* Tips */
  tipRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
    alignItems: "flex-start",
  },
  tipBullet: {
    fontSize: 10,
    color: AMBER,
    fontFamily: "Helvetica-Bold",
  },
  tipText: {
    fontSize: 9.5,
    color: STONE_500,
    lineHeight: 1.5,
    flex: 1,
  },
  /* Footer */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: STONE_100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
  },
  footerText: {
    fontSize: 7,
    color: STONE_500,
  },
  footerBrand: {
    fontSize: 7,
    color: ORANGE,
    fontFamily: "Helvetica-Bold",
  },
});

/* SVG chef-hat icon for the header */
function ChefHatIcon() {
  return (
    <Svg width="28" height="28" viewBox="0 0 24 24">
      <Circle cx="6.5" cy="8" r="3.5" fill={WHITE} opacity="0.9" />
      <Circle cx="17.5" cy="8" r="3.5" fill={WHITE} opacity="0.9" />
      <Circle cx="12" cy="6" r="4" fill={WHITE} opacity="0.9" />
      <Line x1="7" y1="20" x2="17" y2="20" stroke={WHITE} strokeWidth="1.5" />
      <Line x1="7" y1="12" x2="7" y2="20" stroke={WHITE} strokeWidth="1.5" />
      <Line x1="17" y1="12" x2="17" y2="20" stroke={WHITE} strokeWidth="1.5" />
    </Svg>
  );
}

export function RecipePDF({ recipe }) {
  const totalTime =
    parseInt(recipe.prepTime || 0) + parseInt(recipe.cookTime || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Orange header band with logo */}
        <View style={styles.headerBand}>
          <View style={styles.logoArea}>
            <ChefHatIcon />
            <View>
              <Text style={styles.brandName}>ChefMate</Text>
              <Text style={styles.tagline}>AI-Powered Recipe Generator</Text>
            </View>
          </View>
        </View>

        {/* Recipe title & description */}
        <View style={styles.titleArea}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          {recipe.description ? (
            <Text style={styles.description}>{recipe.description}</Text>
          ) : null}
        </View>

        {/* Meta badges */}
        <View style={styles.metaRow}>
          {recipe.cuisine ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Cuisine</Text>
              <Text style={styles.metaValue}>{recipe.cuisine}</Text>
            </View>
          ) : null}
          {recipe.category ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Category</Text>
              <Text style={styles.metaValue}>{recipe.category}</Text>
            </View>
          ) : null}
          {totalTime > 0 ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Total Time</Text>
              <Text style={styles.metaValue}>{totalTime} mins</Text>
            </View>
          ) : null}
          {recipe.servings ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Servings</Text>
              <Text style={styles.metaValue}>{recipe.servings}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Two-column layout: Ingredients | Instructions */}
        <View style={styles.content}>
          <View style={styles.columns}>
            {/* Left - Ingredients */}
            <View style={styles.leftCol}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>Ingredients</Text>
                {recipe.ingredients.map((ing, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ingredientRow,
                      i === recipe.ingredients.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <Text style={styles.ingredientItem}>{ing.item}</Text>
                    <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right - Instructions */}
            <View style={styles.rightCol}>
              <Text style={styles.sectionHeading}>Instructions</Text>
              {recipe.instructions.map((step) => (
                <View key={step.step} style={styles.stepBlock} wrap={false}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>{step.step}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    {step.title ? (
                      <Text style={styles.stepTitle}>{step.title}</Text>
                    ) : null}
                    <Text style={styles.stepText}>{step.instruction}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Chef's Tips */}
          {recipe.tips?.length > 0 && (
            <View style={styles.sectionCard} wrap={false}>
              <Text style={styles.sectionHeading}>{"Chef's Tips"}</Text>
              {recipe.tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>{"\u2605"}</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated by ChefMate — AI-Powered Recipe Generator
          </Text>
          <Text style={styles.footerBrand}>chefmate.app</Text>
        </View>
      </Page>
    </Document>
  );
}
