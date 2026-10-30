/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			grow: {
  				brand: 'hsl(var(--growlog-brand))',
  				forest: 'hsl(var(--grow-forest))',
  				'forest-foreground': 'hsl(var(--grow-forest-foreground))',
  				sage: 'hsl(var(--grow-sage))',
  				moss: 'hsl(var(--grow-moss))',
  				leaf: 'hsl(var(--grow-leaf))',
  				earth: 'hsl(var(--grow-earth))',
  				accent: 'hsl(var(--grow-accent))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			}
  		},
  		boxShadow: {
  			elev1: 'var(--elev-1)',
  			elev2: 'var(--elev-2)'
  		},
  		fontSize: {
  			'app-title': ['1.0625rem', { lineHeight: '1.35', fontWeight: '600' }],
  			'app-caption': ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.04em' }]
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
