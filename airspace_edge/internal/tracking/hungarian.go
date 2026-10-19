package tracking

import (
	"math"
	"sort"
)

// Pair is a matched (row, column).
type Pair struct{ Row, Col int }

// Hungarian returns the minimum-cost assignment, keeping only pairs with cost <= maxCost.
// cost is rows x cols and may be rectangular.
func Hungarian(cost [][]float64, maxCost float64) []Pair {
	rows := len(cost)
	if rows == 0 || len(cost[0]) == 0 {
		return nil
	}
	cols := len(cost[0])
	n := rows
	if cols > n {
		n = cols
	}
	big := maxCost*10 + 1
	c := make([][]float64, n)
	for i := range c {
		c[i] = make([]float64, n)
		for j := range c[i] {
			c[i][j] = big
			if i < rows && j < cols {
				c[i][j] = math.Min(cost[i][j], big)
			}
		}
	}

	u := make([]float64, n+1)
	v := make([]float64, n+1)
	p := make([]int, n+1)
	way := make([]int, n+1)
	for i := 1; i <= n; i++ {
		p[0] = i
		j0 := 0
		minv := make([]float64, n+1)
		used := make([]bool, n+1)
		for j := range minv {
			minv[j] = math.Inf(1)
		}
		for {
			used[j0] = true
			i0, delta, j1 := p[j0], math.Inf(1), 0
			for j := 1; j <= n; j++ {
				if used[j] {
					continue
				}
				cur := c[i0-1][j-1] - u[i0] - v[j]
				if cur < minv[j] {
					minv[j], way[j] = cur, j0
				}
				if minv[j] < delta {
					delta, j1 = minv[j], j
				}
			}
			for j := 0; j <= n; j++ {
				if used[j] {
					u[p[j]] += delta
					v[j] -= delta
				} else {
					minv[j] -= delta
				}
			}
			j0 = j1
			if p[j0] == 0 {
				break
			}
		}
		for j0 != 0 {
			j1 := way[j0]
			p[j0] = p[j1]
			j0 = j1
		}
	}

	var out []Pair
	for j := 1; j <= n; j++ {
		i := p[j] - 1
		if i < rows && j-1 < cols && cost[i][j-1] <= maxCost {
			out = append(out, Pair{i, j - 1})
		}
	}
	sort.Slice(out, func(a, b int) bool { return out[a].Row < out[b].Row })
	return out
}
