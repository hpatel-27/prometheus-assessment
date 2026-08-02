import { Router } from 'express'
import { getStockDailyData } from '../controllers/stockController.js'

/**
 * Stock market routes. Route registration is kept separate from the controller
 * implementation: this module only maps the HTTP method and path to the
 * handler, while request validation, service invocation and response handling
 * live in the controller.
 */
const router = Router()

// Daily aggregates for a single symbol. The `:symbol` parameter is untrusted
// input and is validated/normalized by the controller before any use.
router.get('/api/stocks/:symbol', getStockDailyData)

export default router
