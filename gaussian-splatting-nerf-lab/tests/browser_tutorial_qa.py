"""Interaction QA. Run against the local server; Garden streaming is checked separately."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os
import json

base=os.environ.get('GSPLAT_QA_URL','http://127.0.0.1:4173')
out=Path('/tmp/gsplat-tutorial-qa');out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1100})
    page.set_default_timeout(20000)
    page.add_init_script("sessionStorage.setItem('gsplat-answers-v1', JSON.stringify({b1:0,b2:1,m1:0,m2:1,v1:0,v2:0,c1:1,c2:1,r1:1,r2:1,h1:1,h2:1}))")
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    assert page.goto(base).status==200
    page.wait_for_selector('#basis-main')
    assert page.locator('#module-nav button').count()==7
    assert page.locator('#mechanism-nav').count()==0
    assert page.locator('.question-progress').inner_text()=='0 / 14 checked'
    def canvas(selector):return page.locator(selector).evaluate('(c)=>c.toDataURL()')
    def fill(selector,value):page.locator(selector).fill(str(value))
    before=float(page.locator('#basis-rmse').inner_text());mu=page.locator('#basis-mu').input_value();width=page.locator('#basis-width').input_value()
    page.locator('#basis-fit').click()
    assert float(page.locator('#basis-rmse').inner_text())<before
    assert page.locator('#basis-mu').input_value()==mu and page.locator('#basis-width').input_value()==width
    fill('#basis-n',8);page.locator('#basis-fit').click();assert float(page.locator('#basis-rmse').inner_text())<.05
    page.locator('#basis-next').click();page.wait_for_selector('#dims-surface')
    before=float(page.locator('#dims-rmse').inner_text());page.locator('#dims-fit').click();assert float(page.locator('#dims-rmse').inner_text())<before
    surface=canvas('#dims-surface');approx=canvas('#dims-approx');page.locator('#dims-surface').focus();page.keyboard.press('ArrowRight');assert canvas('#dims-surface')!=surface and canvas('#dims-approx')==approx
    page.locator('#dims-next').click();page.wait_for_selector('#volume-world')
    assert '03 /' in page.locator('#workspace .eyebrow').first.inner_text()
    before=float(page.locator('#volume-loss').inner_text());world=canvas('#volume-world');slice=canvas('#slice-XY-fit')
    page.locator('#volume-world').focus();page.keyboard.press('ArrowRight');assert canvas('#volume-world')!=world and canvas('#slice-XY-fit')==slice
    assert float(page.locator('#volume-loss').inner_text())==before
    fill('#volume-slice',.4);assert canvas('#slice-XY-fit')!=slice;assert '0.40' in page.locator('#slice-XY-label').inner_text()
    fill('#volume-slice',0);page.locator('#volume-step50').click();assert int(page.locator('#volume-iterations').inner_text())==50;assert float(page.locator('#volume-loss').inner_text())<before*.6
    geometry=[page.locator('#volume-'+key).input_value() for key in ['x','y','z','sx','sy','sz','angle']];page.locator('#volume-lse').click();assert geometry==[page.locator('#volume-'+key).input_value() for key in ['x','y','z','sx','sy','sz','angle']]
    page.locator('#volume-run').click();page.wait_for_timeout(150);page.locator('#volume-run').click();page.wait_for_timeout(100);paused=page.locator('#volume-iterations').inner_text();page.wait_for_timeout(200);assert page.locator('#volume-iterations').inner_text()==paused
    page.locator('#volume-target').select_option('ring');fill('#volume-n',8);page.locator('#volume-step50').click();assert page.locator('#volume-count').inner_text()=='8'
    page.locator('#workspace').screenshot(path=str(out/'03-volume.png'))
    page.screenshot(path=str(out/'03-page.png'),full_page=True)
    page.locator('#volume-next').click();page.wait_for_selector('#colour-image');assert page.locator('#colour-selected option').count()==8;assert 'Geometry carried over' in page.locator('#colour-status').inner_text()
    page.locator('#colour-overlap').click();assert page.locator('#colour-table tr').count()==3
    page.locator('.question-link').click();assert page.locator('#tab-colour').get_attribute('aria-selected')=='true';assert page.locator('#question-c1').count()==1
    page.locator('.skip-link').focus();page.keyboard.press('Enter');assert page.locator('#tab-colour').get_attribute('aria-selected')=='true'
    before=canvas('#colour-image');fill('#colour-opacity',.1);assert canvas('#colour-image')!=before
    before=canvas('#colour-image');world=canvas('#colour-world');page.locator('#colour-world').focus();page.keyboard.press('ArrowRight');assert canvas('#colour-world')!=world and canvas('#colour-image')==before
    fill('#colour-yaw',35);assert canvas('#colour-image')!=before
    page.locator('#colour-reset').click();page.locator('#colour-solo').click();axes=page.locator('#colour-axes').inner_text();z=page.locator('#colour-z').input_value();rgb=page.locator('#colour-result').inner_text();page.locator('#colour-ray').click();assert page.locator('#colour-axes').inner_text()==axes and page.locator('#colour-result').inner_text()==rgb;assert page.locator('#colour-z').input_value()!=z
    page.locator('#colour-overlap').click();page.locator('#workspace').screenshot(path=str(out/'04-colour.png'));page.locator('#colour-next').click();page.wait_for_selector('#scene-world')
    assert page.locator('#story-count').inner_text()=='24 / 0';assert page.locator('[data-training="9"]').is_disabled();assert page.locator('#story-refine').is_disabled()
    world=canvas('#scene-world');page.locator('[data-model-view=reference]').click();assert canvas('#scene-world')!=world;assert 'not generated by Gaussian splats' in page.locator('#workspace').inner_text()
    target=canvas('#scene-target');page.locator('#story-budget').select_option('12');assert page.locator('#story-count').inner_text()=='12 / 0';assert canvas('#scene-target')==target
    page.locator('#story-budget').select_option('24');before=float(page.locator('#story-train-loss').inner_text());page.locator('#story-step25').click();assert page.locator('#story-count').inner_text()=='24 / 25';assert float(page.locator('#story-train-loss').inner_text())<before;assert page.locator('#story-refine').is_enabled()
    page.locator('#story-refine').click();assert '25 / 25'==page.locator('#story-count').inner_text();page.locator('#story-step').click();assert '25 / 26'==page.locator('#story-count').inner_text()
    page.locator('#story-run').click();page.wait_for_timeout(150);page.locator('#story-run').click();page.wait_for_timeout(100);paused=page.locator('#story-count').inner_text();page.wait_for_timeout(200);assert page.locator('#story-count').inner_text()==paused
    page.locator('#story-heldout').click();assert page.locator('#target-role').inner_text()=='RESERVED';fill('#story-novel',35);assert page.locator('#target-role').inner_text()=='FREE CAMERA'
    page.locator('[data-coverage=one]').click();assert page.locator('#story-count').inner_text()=='24 / 0';assert page.locator('[data-training]:checked').count()==1
    page.locator('[data-coverage=spread]').click();page.locator('#story-step25').click();page.locator('#story-heldout').click();page.locator('#workspace').screenshot(path=str(out/'05-reconstruction.png'))
    page.locator('#story-next').click();page.wait_for_selector('#nerf-reference')
    assert page.locator('#nerf-count').inner_text()=='970 / 0';assert page.locator('#nerf-sample-rows tr').count()==32
    chart=canvas('#nerf-ray-chart');page.locator('#nerf-samples').select_option('8');assert page.locator('#nerf-sample-rows tr').count()==8;assert canvas('#nerf-ray-chart')!=chart;assert page.locator('#nerf-count').inner_text()=='970 / 0'
    page.locator('#nerf-samples').select_option('32');before=float(page.locator('#nerf-train-loss').inner_text());page.locator('#nerf-step50').click();assert page.locator('#nerf-count').inner_text()=='970 / 50';assert float(page.locator('#nerf-train-loss').inner_text())<before*.3
    assert page.locator('#nerf-source').input_value()=='learned';page.locator('#nerf-source').select_option('reference');assert 'REFERENCE' in page.locator('#nerf-ray-heading').inner_text()
    page.locator('[data-nerf-view="3"]').click();assert page.locator('#nerf-yaw').input_value()=='0';assert page.locator('#nerf-count').inner_text()=='970 / 50'
    page.locator('#nerf-target-row').focus();page.keyboard.press('ArrowRight');assert page.locator('#nerf-pixel').input_value()=='17'
    fill('#nerf-yaw',90);fill('#nerf-pixel',16);page.locator('#workspace').screenshot(path=str(out/'06-nerf.png'))
    page.locator('#nerf-run').click();page.wait_for_timeout(120);page.locator('#nerf-run').click();paused=page.locator('#nerf-count').inner_text();page.wait_for_timeout(250);assert page.locator('#nerf-count').inner_text()==paused
    page.locator('#nerf-training').select_option('one');assert page.locator('#nerf-count').inner_text()=='970 / 0';page.locator('#nerf-step').click();assert page.locator('#nerf-count').inner_text()=='970 / 1'
    page.locator('#nerf-reset').click();assert page.locator('#nerf-count').inner_text()=='970 / 0';assert page.locator('#nerf-samples').input_value()=='32'
    page.locator('#nerf-next').click();assert page.locator('#highres-load').inner_text()=='Load Garden scene · ~187 MB';assert page.locator('#highres-frame').count()==0
    page.route('https://antimatter15.com/**',lambda route:route.fulfill(status=200,content_type='text/html',body='<p>Viewer embed URL test</p>'))
    page.locator('#highres-load').click();assert page.locator('#highres-frame').get_attribute('src')=='https://antimatter15.com/splat/?url=garden.splat';assert page.locator('#highres-fullscreen').is_enabled()
    answers={'mixture':{'b1':1,'b2':2},'dimensions':{'m1':0,'m2':1},'parameters':{'v1':2,'v2':0},'colour':{'c1':1,'c2':2},'reconstruction':{'r1':0,'r2':2},'nerf':{'n1':1,'n2':2},'highres':{'h1':1,'h2':0}}
    for route,qs in answers.items():
        page.locator('#tab-'+route).click()
        for id,value in qs.items():
            card=page.locator('#question-'+id)
            assert card.locator('.question-scenario').inner_text()
            assert card.locator('.question-extension p').inner_text()
            card.locator('.question-hint summary').click();assert card.locator('.question-hint p').is_visible()
            for choice in range(3):
                page.locator(f'input[name={id}][value="{choice}"]').check();page.locator(f'[data-check={id}]').click()
                feedback=page.locator('#feedback-'+id+' .feedback')
                assert feedback.inner_text().startswith('Correct.' if choice==value else 'Reconsider.')
                assert ('incorrect' in feedback.get_attribute('class'))==(choice!=value)
            page.locator(f'input[name={id}][value="{value}"]').check();page.locator(f'[data-check={id}]').click()
            card.locator('.worked summary').click();assert card.locator('.worked .equation').is_visible()
            assert card.locator('.worked h4').all_inner_texts()==['Follow-up reasoning','Test it in the lab']
            assert 'undefined' not in card.inner_text()
        assert page.locator('.worked').count()==2
        if route in ['parameters','colour','nerf']:
            page.locator('#questions').screenshot(path=str(out/(route+'-questions.png')))
        page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),route
        if route=='colour':page.locator('#questions').screenshot(path=str(out/'mobile-questions.png'))
        page.set_viewport_size({'width':1440,'height':1100})
    assert page.locator('.question-progress').inner_text()=='14 / 14 checked'
    page.reload();page.wait_for_selector('#highres-load');assert page.locator('.question-progress').inner_text()=='14 / 14 checked'
    assert page.locator('#feedback-h1').inner_text().startswith('Correct.')
    assert page.locator('#feedback-h2').inner_text().startswith('Correct.')
    page.locator('#tab-mixture').focus();page.keyboard.press('ArrowRight');assert page.locator('#tab-dimensions').get_attribute('aria-selected')=='true';page.keyboard.press('End');assert page.locator('#tab-highres').get_attribute('aria-selected')=='true';page.keyboard.press('Home');assert page.locator('#tab-mixture').get_attribute('aria-selected')=='true'
    for route in answers:
        page.locator('#tab-'+route).click();page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),route
        if route=='parameters':page.screenshot(path=str(out/'mobile-volume.png'),full_page=True)
        page.set_viewport_size({'width':1440,'height':1100})
    page.goto(base+'/#projection');page.wait_for_selector('#colour-image');assert page.locator('#tab-colour').get_attribute('aria-selected')=='true'
    page.goto(base+'/#parameters');page.wait_for_selector('#volume-world');page.locator('#reset-all').click();assert page.locator('#volume-count').inner_text()=='1';assert page.locator('.question-progress').inner_text()=='0 / 14 checked'
    assert not errors,errors
    print(json.dumps({'status':'passed','sections':7,'questions':14,'browser_errors':errors,'screenshots':str(out),'garden':'lazy iframe URL verified; full remote WebGL rendering not exercised'},indent=2))
    browser.close()
