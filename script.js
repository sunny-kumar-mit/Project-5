const calorieRecommendations = {
  vegetarian: { min: 1800, max: 2200 },
  vegan: { min: 1600, max: 2000 },
  "non-vegetarian": { min: 2000, max: 2500 }
};

document.addEventListener("DOMContentLoaded", () => {
  const caloriesInput = document.getElementById("calories");
  caloriesInput.addEventListener("input", updateCalorieDisplay);
  document
    .getElementById("diet-type")
    .addEventListener("change", updateCalorieSuggestions);
  updateCalorieSuggestions();
});

function updateCalorieDisplay() {
  document.getElementById("calorie-value").textContent = this.value;
}

function updateCalorieSuggestions() {
  const diet = document.getElementById("diet-type").value;
  const suggestion = calorieRecommendations[diet];
  document.getElementById("suggested-calories").textContent =
    `${suggestion.min}-${suggestion.max} kcal`;
}

document.getElementById("meal-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const age = parseInt(document.getElementById("age").value);
  const weight = parseInt(document.getElementById("weight").value);
  const activityLevel = document.getElementById("activity-level").value;
  const dietType = document.getElementById("diet-type").value;
  const targetCalories = parseInt(document.getElementById("calories").value);

  try {
    const response = await fetch("meals.json");
    const data = await response.json();

    const mainPlan = createBalancedPlan(data.meals, dietType, targetCalories);
    const alternatives = getAlternativeSuggestions(data.meals, dietType, mainPlan);

    displayMealPlan(mainPlan);
    displayAlternatives(alternatives);
    displayRecommendations(name, age, weight, activityLevel);

    // Ensure the recommendation section is visible and positioned correctly
    const recommendationSection = document.getElementById("recommendation");
    recommendationSection.style.display = "block";
    document.getElementById("meal-plan").appendChild(recommendationSection);
  } catch (error) {
    showError("Failed to load meal data. Please try again later.");
  }
});

function createBalancedPlan(meals, diet, targetCalories) {
  const plan = { 
    totalCalories: 0, 
    totalProtein: 0,
    targetCalories,
    meals: [] 
  };

  const categoryTargets = {
    breakfast: targetCalories * 0.25,
    lunch: targetCalories * 0.35,
    dinner: targetCalories * 0.30
  };

  Object.keys(categoryTargets).forEach(category => {
    const options = meals.filter(m => m.diet === diet && m.category === category);
    if (options.length > 0) {
      const targetForMeal = categoryTargets[category];
      const best = options.reduce((prev, curr) =>
        Math.abs(curr.nutrition.calories - targetForMeal) < 
        Math.abs(prev.nutrition.calories - targetForMeal)
          ? curr
          : prev
      );
      plan.meals.push(best);
      plan.totalCalories += best.nutrition.calories;
      plan.totalProtein += best.nutrition.protein;
    }
  });

  const remaining = targetCalories - plan.totalCalories;
  if (remaining > 0) {
    const snacks = meals.filter(m => m.diet === diet && m.category === "snack");
    if (snacks.length > 0) {
      const snackCombo = findBestSnackCombination(remaining, snacks);
      if (snackCombo && snackCombo.length) {
        snackCombo.forEach(snack => {
          plan.meals.push(snack);
          plan.totalCalories += snack.nutrition.calories;
          plan.totalProtein += snack.nutrition.protein;
        });
      }
    }
  }
  return plan;
}

function findBestSnackCombination(target, snacks) {
  const maxSnackCal = Math.max(...snacks.map(s => s.nutrition.calories));
  const maxSum = target + maxSnackCal;
  const dp = new Array(maxSum + 1).fill(null);
  dp[0] = [];

  for (let s = 0; s <= maxSum; s++) {
    if (dp[s] !== null) {
      snacks.forEach(snack => {
        const newSum = s + snack.nutrition.calories;
        if (newSum <= maxSum) {
          if (dp[newSum] === null) {
            dp[newSum] = dp[s].concat(snack);
          }
        }
      });
    }
  }
  
  let bestSum = null;
  for (let s = 0; s <= maxSum; s++) {
    if (dp[s] !== null) {
      if (bestSum === null || Math.abs(s - target) < Math.abs(bestSum - target)) {
        bestSum = s;
      }
    }
  }
  return dp[bestSum];
}

function getAlternativeSuggestions(allMeals, diet, currentPlan) {
  const currentMealIds = currentPlan.meals.map(m => m.id);
  return allMeals
    .filter(m => m.diet === diet && !currentMealIds.includes(m.id))
    .slice(0, 4);
}

function displayMealPlan(plan) {
  const mealList = document.getElementById("meal-list");
  const nutritionSummary = document.getElementById("nutrition-summary");

  mealList.innerHTML = "";
  nutritionSummary.innerHTML = `
    <div class="nutrition-summary">
      <h3>Nutrition Summary (Actual/Target)</h3>
      <div class="nutrition-facts">
        <div class="nutrition-item">
          ${plan.totalCalories}/${plan.targetCalories}<span>Calories</span>
        </div>
        <div class="nutrition-item">
          ${plan.totalProtein}g<span>Protein</span>
        </div>
      </div>
      <p class="calorie-difference">${
        plan.totalCalories >= plan.targetCalories ? '✅' : '⚠️'
      } ${Math.abs(plan.totalCalories - plan.targetCalories)} kcal ${
        plan.totalCalories >= plan.targetCalories ? 'over' : 'under'
      } target</p>
    </div>
  `;

  plan.meals.forEach(meal => {
    const mealCard = createMealCard(meal);
    mealList.appendChild(mealCard);
  });
}

function displayAlternatives(meals) {
  const container = document.getElementById("alternative-meals");
  container.innerHTML = `
    <h3 class="alternative-heading">You Might Also Like</h3>
    <div class="meal-list"></div>
  `;

  const list = container.querySelector(".meal-list");
  meals.forEach(meal => {
    const mealCard = createMealCard(meal);
    list.appendChild(mealCard);
  });
}

function createMealCard(meal) {
  const card = document.createElement("div");
  card.className = "meal-card";
  card.innerHTML = `
    <div class="meal-badge">${meal.category}</div>
    <img src="${meal.image}" class="meal-image" alt="${meal.name}">
    <div class="meal-content">
      <h3>${meal.name}</h3>
      <div class="nutrition-facts">
        <div class="nutrition-item">
          ${meal.nutrition.calories}<span>Calories</span>
        </div>
        <div class="nutrition-item">
          ${meal.nutrition.protein}g<span>Protein</span>
        </div>
        <div class="nutrition-item">
          ${meal.nutrition.carbs}g<span>Carbs</span>
        </div>
        <div class="nutrition-item">
          ${meal.nutrition.fats}g<span>Fats</span>
        </div>
      </div>
      <p><strong>Key Ingredients:</strong> ${meal.ingredients.join(", ")}</p>
    </div>
  `;
  return card;
}

function showError(message) {
  const container = document.getElementById("meal-plan");
  container.innerHTML = `
    <div class="error-message">
      <h3>⚠️ Error</h3>
      <p>${message}</p>
    </div>
  `;
}

function displayRecommendations(name, age, weight, activityLevel) {
  const recommendationSection = document.getElementById("recommendation");
  const greeting = document.getElementById("greeting");
  const healthRecommendations = document.getElementById("health-recommendations");

  const activityTips = {
    sedentary: "Consider incorporating light physical activities like walking or stretching into your routine.",
    light: "Maintain your activity level and try adding moderate exercises like jogging or cycling.",
    moderate: "Great job! Keep up your routine and ensure proper recovery with balanced meals.",
    active: "You're very active! Focus on high-protein meals to support muscle recovery.",
    "very-active": "Ensure you're consuming enough calories and nutrients to sustain your high activity level."
  };

  greeting.innerHTML = `<h3>Hello, ${name}!</h3>`;
  healthRecommendations.innerHTML = `
    <p>Based on your age (${age}), weight (${weight} kg), and activity level (${activityLevel.replace("-", " ")}), here are some tips:</p>
    <ul>
      <li>Maintain a balanced diet with adequate protein, carbs, and fats.</li>
      <li>${activityTips[activityLevel]}</li>
      <li>Stay hydrated by drinking at least 2-3 liters of water daily.</li>
      <li>Ensure you get 7-8 hours of sleep every night for recovery.</li>
    </ul>
  `;

  recommendationSection.style.display = "block";
}